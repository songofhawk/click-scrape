// Check if extension context is still valid
function isExtensionContextValid() {
  try {
    return chrome.runtime && chrome.runtime.id;
  } catch (e) {
    return false;
  }
}

// Create overlay for element highlighting
function createOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'click-scrape-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.1);
    z-index: 999999;
    pointer-events: none;
    display: none;
  `;
  document.body.appendChild(overlay);
  return overlay;
}

// Create highlight box
function createHighlightBox() {
  const box = document.createElement('div');
  box.id = 'click-scrape-highlight';
  box.style.cssText = `
    position: absolute;
    border: 2px solid #0078d4;
    background: rgba(0, 120, 212, 0.1);
    pointer-events: none;
    z-index: 1000000;
    display: none;
    box-sizing: border-box;
  `;
  document.body.appendChild(box);
  return box;
}

// Create info panel
function createInfoPanel() {
  const panel = document.createElement('div');
  panel.id = 'click-scrape-info';
  panel.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: #0078d4;
    color: white;
    padding: 10px;
    border-radius: 5px;
    font-family: monospace;
    font-size: 12px;
    z-index: 1000001;
    max-width: 300px;
    display: none;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
  `;
  document.body.appendChild(panel);
  return panel;
}

// Function to generate a unique CSS selector for an element
function generateSelector(el) {
  let path = [];
  while (el && el.nodeType === Node.ELEMENT_NODE) {
    let selector = el.tagName.toLowerCase();
    if (el.id) {
      selector += '#' + el.id;
      path.unshift(selector);
      break;
    } else {
      let sib = el, nth = 1;
      while (sib = sib.previousElementSibling) {
        if (sib.tagName.toLowerCase() == selector) {
          nth++;
        }
      }
      if (nth != 1) {
        selector += ':nth-of-type(' + nth + ')';
      }
    }
    path.unshift(selector);
    el = el.parentNode;
  }
  return path.join(' > ');
}

// Get element position and size
function getElementBounds(element) {
  const rect = element.getBoundingClientRect();
  return {
    top: rect.top + window.scrollY,
    left: rect.left + window.scrollX,
    width: rect.width,
    height: rect.height
  };
}

// Highlight element
function highlightElement(element, highlightBox, infoPanel) {
  const bounds = getElementBounds(element);
  const selector = generateSelector(element);
  const text = element.textContent.trim().substring(0, 100);
  
  // Position highlight box
  highlightBox.style.display = 'block';
  highlightBox.style.top = bounds.top + 'px';
  highlightBox.style.left = bounds.left + 'px';
  highlightBox.style.width = bounds.width + 'px';
  highlightBox.style.height = bounds.height + 'px';
  
  // Update info panel
  infoPanel.style.display = 'block';
  infoPanel.innerHTML = `
    <div><strong>Tag:</strong> ${element.tagName.toLowerCase()}</div>
    <div><strong>Text:</strong> ${text}${element.textContent.length > 100 ? '...' : ''}</div>
    <div><strong>Selector:</strong> ${selector}</div>
    <div style="margin-top: 5px; font-size: 10px; opacity: 0.8;">Click to select • ESC to cancel</div>
  `;
}

// Hide highlight
function hideHighlight(highlightBox, infoPanel) {
  highlightBox.style.display = 'none';
  infoPanel.style.display = 'none';
}

// Main selection logic
function startElementSelection() {
  if (!isExtensionContextValid()) {
    console.log('Extension context invalidated');
    return;
  }

  // Create UI elements
  const overlay = createOverlay();
  const highlightBox = createHighlightBox();
  const infoPanel = createInfoPanel();
  
  let isSelecting = true;
  let currentElement = null;

  // Show overlay
  overlay.style.display = 'block';

  // Mouse move handler
  function handleMouseMove(event) {
    if (!isSelecting) return;
    
    const element = document.elementFromPoint(event.clientX, event.clientY);
    if (element && element !== currentElement) {
      currentElement = element;
      highlightElement(element, highlightBox, infoPanel);
    }
  }

  // Click handler
  function handleClick(event) {
    if (!isSelecting) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    if (currentElement) {
      const elementText = currentElement.textContent.trim();
      const elementSelector = generateSelector(currentElement);
      
      // Send data to popup
      try {
        chrome.runtime.sendMessage({
          action: 'elementClicked',
          data: {
            text: elementText,
            selector: elementSelector,
            tagName: currentElement.tagName.toLowerCase(),
            attributes: Array.from(currentElement.attributes).map(attr => `${attr.name}="${attr.value}"`).join(' ')
          }
        });
      } catch (error) {
        console.log('Error sending message:', error);
      }
    }
    
    // Clean up
    cleanup();
  }

  // Escape key handler
  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      cleanup();
    }
  }

  // Cleanup function
  function cleanup() {
    isSelecting = false;
    overlay.style.display = 'none';
    hideHighlight(highlightBox, infoPanel);
    
    // Remove event listeners
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('click', handleClick, true);
    document.removeEventListener('keydown', handleKeyDown);
    
    // Remove UI elements
    setTimeout(() => {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (highlightBox.parentNode) highlightBox.parentNode.removeChild(highlightBox);
      if (infoPanel.parentNode) infoPanel.parentNode.removeChild(infoPanel);
    }, 100);
  }

  // Add event listeners
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('click', handleClick, true);
  document.addEventListener('keydown', handleKeyDown);
  
  console.log('Element selection started. Hover over elements and click to select, or press ESC to cancel.');
}

// Check if this script has already been injected
if (!window.clickScrapeInjected) {
  window.clickScrapeInjected = true;
  
  // Listen for messages from popup to start selection
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'startSelection') {
      startElementSelection();
      sendResponse({ success: true });
    }
  });
  
  console.log('Click & Scrape content script loaded');
}
  