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

// Create enhanced info panel with history
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
    font-family: sans-serif;
    font-size: 12px;
    z-index: 1000001;
    max-width: 400px;
    max-height: 600px;
    display: none;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    overflow: hidden;
  `;
  
  panel.innerHTML = `
    <div id="current-element-info" style="margin-bottom: 10px;">
      <div style="font-weight: bold; margin-bottom: 5px;">🎯 Current Element</div>
      <div id="element-details"></div>
    </div>
    <div id="history-section" style="border-top: 1px solid rgba(255,255,255,0.3); padding-top: 10px;">
      <div style="font-weight: bold; margin-bottom: 5px; display: flex; justify-content: space-between; align-items: center;">
        <span>📝 Click History</span>
        <div>
          <button id="clear-history" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; cursor: pointer; margin-right: 5px;">Clear</button>
          <button id="close-panel" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; cursor: pointer;">Close</button>
        </div>
      </div>
      <div id="history-content" style="max-height: 300px; overflow-y: auto;">
        <div class="empty-state" style="text-align: center; color: rgba(255,255,255,0.7); padding: 10px; font-style: italic; font-size: 11px;">
          No elements clicked yet
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(panel);
  
  // Add clear history button functionality
  panel.querySelector('#clear-history').addEventListener('click', (e) => {
    e.stopPropagation();
    if (confirm('Clear all click history?')) {
      localStorage.removeItem('clickScrapeHistory');
      loadAndDisplayHistory();
    }
  });
  
  // Add close panel button functionality
  panel.querySelector('#close-panel').addEventListener('click', (e) => {
    e.stopPropagation();
    // Hide the panel and stop selection mode
    panel.style.display = 'none';
    // Remove any existing selection mode
    const existingOverlay = document.getElementById('click-scrape-overlay');
    const existingHighlight = document.getElementById('click-scrape-highlight');
    if (existingOverlay) existingOverlay.remove();
    if (existingHighlight) existingHighlight.remove();
    // Remove event listeners
    document.removeEventListener('mousemove', window.clickScrapeMouseMove);
    document.removeEventListener('click', window.clickScrapeClick, true);
    document.removeEventListener('keydown', window.clickScrapeKeyDown);
  });
  
  return panel;
}

// Local storage functions
function saveToHistory(elementData) {
  try {
    const history = JSON.parse(localStorage.getItem('clickScrapeHistory') || '[]');
    const historyItem = {
      id: Date.now(),
      timestamp: new Date().toLocaleString(),
      tagName: elementData.tagName,
      text: elementData.text,
      selector: elementData.selectors[0]?.selector || 'N/A'
    };
    
    // Add to beginning of array (most recent first)
    history.unshift(historyItem);
    
    // Keep only last 20 items
    if (history.length > 20) {
      history.splice(20);
    }
    
    localStorage.setItem('clickScrapeHistory', JSON.stringify(history));
    loadAndDisplayHistory();
  } catch (error) {
    console.error('Error saving to history:', error);
  }
}

function loadAndDisplayHistory() {
  const historyContent = document.getElementById('history-content');
  if (!historyContent) return;
  
  try {
    const history = JSON.parse(localStorage.getItem('clickScrapeHistory') || '[]');
    
    if (history.length === 0) {
      historyContent.innerHTML = '<div class="empty-state" style="text-align: center; color: rgba(255,255,255,0.7); padding: 10px; font-style: italic; font-size: 11px;">No elements clicked yet</div>';
    } else {
      historyContent.innerHTML = `
        <table style="width: 100%; font-size: 10px; border-collapse: collapse;">
          <thead>
            <tr style="background: rgba(255,255,255,0.1);">
              <th style="padding: 4px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.3);">Tag</th>
              <th style="padding: 4px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.3);">Content</th>
              <th style="padding: 4px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.3);">Selector</th>
              <th style="padding: 4px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.3);">Time</th>
            </tr>
          </thead>
          <tbody>
            ${history.map(item => `
              <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
                <td style="padding: 4px; font-weight: bold;">${item.tagName}</td>
                <td style="padding: 4px; max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${item.text || '(no text)'}">${item.text ? item.text.substring(0, 20) + (item.text.length > 20 ? '...' : '') : '(no text)'}</td>
                <td style="padding: 4px; font-family: monospace; cursor: pointer;" onclick="navigator.clipboard.writeText('${item.selector}'); this.style.background='rgba(255,255,255,0.2)'; setTimeout(() => this.style.background='transparent', 1000);" title="Click to copy">${item.selector}</td>
                <td style="padding: 4px; font-size: 9px; color: rgba(255,255,255,0.8);">${item.timestamp}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }
  } catch (error) {
    console.error('Error loading history:', error);
    historyContent.innerHTML = '<div class="empty-state" style="text-align: center; color: rgba(255,255,255,0.7); padding: 10px; font-style: italic; font-size: 11px;">Error loading history</div>';
  }
}

// Function to generate multiple CSS selectors for an element
function generateMultipleSelectors(el) {
  const selectors = [];
  
  // 1. ID选择器（最优先）
  if (el.id) {
    selectors.push({
      type: 'ID',
      selector: `#${el.id}`,
      description: '通过ID选择（最精确）',
      priority: 1
    });
  }
  
  // 2. Class选择器
  if (el.className && typeof el.className === 'string') {
    const classes = el.className.trim().split(/\s+/).filter(c => c.length > 0);
    if (classes.length > 0) {
      // 单个class
      classes.forEach(cls => {
        selectors.push({
          type: 'Class',
          selector: `.${cls}`,
          description: `通过class "${cls}" 选择`,
          priority: 2
        });
      });
      
      // 多个class组合
      if (classes.length > 1) {
        selectors.push({
          type: 'Multiple Classes',
          selector: `.${classes.join('.')}`,
          description: `通过多个class组合选择`,
          priority: 2
        });
      }
    }
  }
  
  // 3. 属性选择器
  const attributes = ['data-testid', 'data-test', 'data-cy', 'name', 'type', 'value', 'href', 'src', 'alt', 'title'];
  attributes.forEach(attr => {
    const value = el.getAttribute(attr);
    if (value) {
      selectors.push({
        type: 'Attribute',
        selector: `[${attr}="${value}"]`,
        description: `通过${attr}属性选择`,
        priority: 3
      });
    }
  });
  
  // 4. 标签选择器
  selectors.push({
    type: 'Tag',
    selector: el.tagName.toLowerCase(),
    description: `通过标签名选择（${el.tagName.toLowerCase()}）`,
    priority: 4
  });
  
  // 5. 文本内容选择器（如果文本内容较短且唯一）
  const text = el.textContent.trim();
  if (text && text.length > 0 && text.length < 50 && !text.includes('\n')) {
    selectors.push({
      type: 'Text Content',
      selector: `${el.tagName.toLowerCase()}:contains("${text}")`,
      description: `通过文本内容选择（注意：:contains不是标准CSS）`,
      priority: 5
    });
  }
  
  // 6. 层级选择器（从当前元素到根元素）
  const pathSelectors = generatePathSelectors(el);
  pathSelectors.forEach((path, index) => {
    selectors.push({
      type: 'Path',
      selector: path,
      description: `层级选择器（${index + 1}级）`,
      priority: 6 + index
    });
  });
  
  // 7. 父级选择器（如果父元素有ID或class）
  let parent = el.parentElement;
  let level = 1;
  while (parent && level <= 3) {
    if (parent.id) {
      selectors.push({
        type: 'Parent ID',
        selector: `#${parent.id} > ${el.tagName.toLowerCase()}`,
        description: `通过父元素ID选择（${level}级父元素）`,
        priority: 7 + level
      });
    }
    if (parent.className && typeof parent.className === 'string') {
      const parentClasses = parent.className.trim().split(/\s+/).filter(c => c.length > 0);
      if (parentClasses.length > 0) {
        selectors.push({
          type: 'Parent Class',
          selector: `.${parentClasses[0]} > ${el.tagName.toLowerCase()}`,
          description: `通过父元素class选择（${level}级父元素）`,
          priority: 7 + level
        });
      }
    }
    parent = parent.parentElement;
    level++;
  }
  
  // 按优先级排序
  selectors.sort((a, b) => a.priority - b.priority);
  
  return selectors;
}

// 生成层级选择器
function generatePathSelectors(el) {
  const paths = [];
  let current = el;
  let path = [];
  
  while (current && current.nodeType === Node.ELEMENT_NODE && path.length < 5) {
    let selector = current.tagName.toLowerCase();
    
    if (current.id) {
      selector += '#' + current.id;
      path.unshift(selector);
      break;
    } else if (current.className && typeof current.className === 'string') {
      const classes = current.className.trim().split(/\s+/).filter(c => c.length > 0);
      if (classes.length > 0) {
        selector += '.' + classes[0];
      }
    } else {
      // 添加nth-child
      let nth = 1;
      let sibling = current.previousElementSibling;
      while (sibling) {
        if (sibling.tagName === current.tagName) {
          nth++;
        }
        sibling = sibling.previousElementSibling;
      }
      if (nth > 1) {
        selector += `:nth-of-type(${nth})`;
      }
    }
    
    path.unshift(selector);
    current = current.parentElement;
  }
  
  // 生成不同长度的路径
  for (let i = 1; i <= Math.min(path.length, 4); i++) {
    paths.push(path.slice(-i).join(' > '));
  }
  
  return paths;
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
  const selectors = generateMultipleSelectors(element);
  const text = element.textContent.trim().substring(0, 100);
  
  // Position highlight box
  highlightBox.style.display = 'block';
  highlightBox.style.top = bounds.top + 'px';
  highlightBox.style.left = bounds.left + 'px';
  highlightBox.style.width = bounds.width + 'px';
  highlightBox.style.height = bounds.height + 'px';
  
  // Update current element info
  const elementDetails = infoPanel.querySelector('#element-details');
  if (elementDetails) {
    elementDetails.innerHTML = `
      <div style="margin-bottom: 3px;"><strong>Tag:</strong> ${element.tagName.toLowerCase()}</div>
      <div style="margin-bottom: 3px;"><strong>Text:</strong> ${text}${element.textContent.length > 100 ? '...' : ''}</div>
      <div style="margin-bottom: 3px;"><strong>Best Selector:</strong> ${selectors[0] ? selectors[0].selector : 'N/A'}</div>
      <div style="margin-top: 5px; font-size: 10px; opacity: 0.8;">Click to select • ESC to cancel</div>
    `;
  }
  
  // Show info panel and load history
  infoPanel.style.display = 'block';
  loadAndDisplayHistory();
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

  // Check if selection is already active
  if (window.clickScrapeActive) {
    console.log('Selection already active');
    return;
  }

  // Create UI elements
  const overlay = createOverlay();
  const highlightBox = createHighlightBox();
  const infoPanel = createInfoPanel();
  
  window.clickScrapeActive = true;
  let currentElement = null;

  // Show overlay
  overlay.style.display = 'block';
  infoPanel.style.display = 'block';
  loadAndDisplayHistory();

  // Mouse move handler
  window.clickScrapeMouseMove = function(event) {
    if (!window.clickScrapeActive) return;
    
    const element = document.elementFromPoint(event.clientX, event.clientY);
    if (element && element !== currentElement) {
      currentElement = element;
      highlightElement(element, highlightBox, infoPanel);
    }
  };

  // Click handler
  window.clickScrapeClick = function(event) {
    if (!window.clickScrapeActive) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    if (currentElement) {
      const elementText = currentElement.textContent.trim();
      const selectors = generateMultipleSelectors(currentElement);
      
      const elementData = {
        text: elementText,
        selectors: selectors,
        tagName: currentElement.tagName.toLowerCase(),
        attributes: Array.from(currentElement.attributes).map(attr => `${attr.name}="${attr.value}"`).join(' ')
      };
      
      // Save to localStorage history
      saveToHistory(elementData);
      
      // Send data to background script
      try {
        chrome.runtime.sendMessage({
          action: 'elementClicked',
          data: elementData
        });
      } catch (error) {
        console.log('Error sending message:', error);
      }
      
      // Show success feedback
      const elementDetails = infoPanel.querySelector('#element-details');
      if (elementDetails) {
        const originalContent = elementDetails.innerHTML;
        elementDetails.innerHTML = `
          <div style="color: #90EE90; font-weight: bold; margin-bottom: 5px;">✅ Element Selected!</div>
          <div style="margin-bottom: 3px;"><strong>Tag:</strong> ${currentElement.tagName.toLowerCase()}</div>
          <div style="margin-bottom: 3px;"><strong>Text:</strong> ${elementText.substring(0, 50)}${elementText.length > 50 ? '...' : ''}</div>
          <div style="margin-bottom: 3px;"><strong>Best Selector:</strong> ${selectors[0] ? selectors[0].selector : 'N/A'}</div>
          <div style="margin-top: 5px; font-size: 10px; opacity: 0.8;">Continue selecting or press ESC to exit</div>
        `;
        
        // Restore original content after 2 seconds
        setTimeout(() => {
          if (window.clickScrapeActive) {
            elementDetails.innerHTML = originalContent;
          }
        }, 2000);
      }
    }
    
    // Don't cleanup - keep selection mode active
  };

  // Escape key handler
  window.clickScrapeKeyDown = function(event) {
    if (event.key === 'Escape') {
      cleanup();
    }
  };

  // Cleanup function
  function cleanup() {
    window.clickScrapeActive = false;
    overlay.style.display = 'none';
    hideHighlight(highlightBox, infoPanel);
    
    // Remove event listeners
    document.removeEventListener('mousemove', window.clickScrapeMouseMove);
    document.removeEventListener('click', window.clickScrapeClick, true);
    document.removeEventListener('keydown', window.clickScrapeKeyDown);
    
    // Remove UI elements
    setTimeout(() => {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (highlightBox.parentNode) highlightBox.parentNode.removeChild(highlightBox);
      if (infoPanel.parentNode) infoPanel.parentNode.removeChild(infoPanel);
    }, 100);
  }

  // Add event listeners
  document.addEventListener('mousemove', window.clickScrapeMouseMove);
  document.addEventListener('click', window.clickScrapeClick, true);
  document.addEventListener('keydown', window.clickScrapeKeyDown);
  
  console.log('Element selection started. Hover over elements and click to select, or press ESC to cancel.');
}


// Check if this script has already been injected
if (!window.clickScrapeInjected) {
  window.clickScrapeInjected = true;
  
  // Listen for messages from background script to start selection
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'startSelection') {
      startElementSelection();
      sendResponse({ success: true });
    }
  });
  
  console.log('Click & Scrape content script loaded');
}
  