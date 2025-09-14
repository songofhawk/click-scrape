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
    width: 400px;
    max-width: 400px;
    max-height: 600px;
    display: none;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    overflow: hidden;
    cursor: move;
    user-select: none;
  `;
  
  // Add data attribute to mark this as the info panel
  panel.setAttribute('data-click-scrape-panel', 'true');
  
  panel.innerHTML = `
    <div id="panel-header" style="cursor: move; padding: 5px 0; margin: -10px -10px 10px -10px; padding: 10px; background: rgba(255,255,255,0.15); border-radius: 5px 5px 0 0; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.2);">
      <span style="font-weight: bold;">🔧 Element Scraper Panel</span>
      <span style="font-size: 10px; opacity: 0.8; background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 3px;">⬍⬍ Drag to move</span>
    </div>
    <div id="current-element-info" style="margin-bottom: 10px;">
      <div style="font-weight: bold; margin-bottom: 5px;">🎯 Current Element</div>
      <div id="element-details"></div>
    </div>
    <div id="history-section" style="border-top: 1px solid rgba(255,255,255,0.3); padding-top: 10px; width: 100%; min-height: 200px; display: block;">
      <div style="font-weight: bold; margin-bottom: 5px; display: flex; justify-content: space-between; align-items: center;">
        <span>📝 Click History</span>
        <div>
          <button id="clear-history" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; cursor: pointer; margin-right: 5px;">Clear</button>
          <button id="close-panel" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; cursor: pointer;">Close</button>
        </div>
      </div>
      <div id="history-content" style="width: 100%; min-height: 100px; max-height: 300px; overflow-y: auto; background: rgba(0,0,0,0.1); display: block;">
        <div class="empty-state" style="text-align: center; color: rgba(255,255,255,0.7); padding: 10px; font-style: italic; font-size: 11px;">
          No elements clicked yet
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(panel);
  
  // Prevent click-through on the entire panel
  panel.addEventListener('click', (e) => {
    e.stopPropagation();
  });
  
  // Add clear history button functionality
  panel.querySelector('#clear-history').addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    if (confirm('Clear all click history?')) {
      localStorage.removeItem('clickScrapeHistory');
      loadAndDisplayHistory();
    }
    return false;
  });
  
  // Add close panel button functionality
  panel.querySelector('#close-panel').addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
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
    window.clickScrapeActive = false;
    return false;
  });
  
  // Add drag functionality
  let isDragging = false;
  let currentX = 0;
  let currentY = 0;
  let initialX = 0;
  let initialY = 0;
  let xOffset = 0;
  let yOffset = 0;
  let hasBeenDragged = false; // Track if panel has been dragged before
  
  const header = panel.querySelector('#panel-header');
  
  header.addEventListener('mousedown', (e) => {
    // If this is the first drag, calculate initial position from right-positioned panel
    if (!hasBeenDragged) {
      const rect = panel.getBoundingClientRect();
      currentX = rect.left;
      currentY = rect.top;
      xOffset = currentX;
      yOffset = currentY;
      hasBeenDragged = true;
      
      // Switch from right positioning to left positioning
      panel.style.right = 'auto';
      panel.style.left = currentX + 'px';
      panel.style.top = currentY + 'px';
    }
    
    initialX = e.clientX - xOffset;
    initialY = e.clientY - yOffset;
    
    if (e.target === header || header.contains(e.target)) {
      isDragging = true;
      panel.style.cursor = 'grabbing';
    }
  });
  
  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;
      
      xOffset = currentX;
      yOffset = currentY;
      
      // Ensure panel stays within viewport
      const rect = panel.getBoundingClientRect();
      const maxX = window.innerWidth - rect.width;
      const maxY = window.innerHeight - rect.height;
      
      currentX = Math.max(0, Math.min(currentX, maxX));
      currentY = Math.max(0, Math.min(currentY, maxY));
      
      panel.style.left = currentX + 'px';
      panel.style.top = currentY + 'px';
    }
  });
  
  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      panel.style.cursor = 'move';
    }
  });
  
  // Add hover tracking to disable element capturing when over panel
  let isOverPanel = false;
  
  panel.addEventListener('mouseenter', () => {
    isOverPanel = true;
    window.clickScrapePanelHover = true;
    // Hide highlight box when hovering over panel
    const highlightBox = document.getElementById('click-scrape-highlight');
    if (highlightBox) {
      highlightBox.style.display = 'none';
    }
  });
  
  panel.addEventListener('mouseleave', () => {
    isOverPanel = false;
    window.clickScrapePanelHover = false;
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
      const htmlContent = `
        <table style="width: 100%; font-size: 10px; border-collapse: collapse; color: white; background: transparent; table-layout: fixed;">
          <thead>
            <tr style="background: rgba(255,255,255,0.1);">
              <th style="padding: 4px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.3);">Tag</th>
              <th style="padding: 4px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.3);">Content</th>
              <th style="padding: 4px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.3);">Selector</th>
              <th style="padding: 4px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.3);">Quality</th>
              <th style="padding: 4px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.3);">Time</th>
            </tr>
          </thead>
          <tbody>
            ${history.map(item => {
              // 检查选择器质量
              let quality = '';
              let qualityColor = 'rgba(255,255,255,0.8)';
              
              if (item.selector.startsWith('#')) {
                quality = 'ID ✅🔒';
                qualityColor = 'rgba(144, 238, 144, 0.8)'; // 绿色
              } else if (item.selector.includes('data-test') || item.selector.includes('data-cy')) {
                quality = 'Test ✅🔒';
                qualityColor = 'rgba(144, 238, 144, 0.8)'; // 绿色
              } else if (item.selector.startsWith('.') && !item.selector.includes('nth')) {
                quality = 'Class ✅🔒';
                qualityColor = 'rgba(255, 255, 0, 0.8)'; // 黄色
              } else if (item.selector.includes('nth')) {
                quality = 'Position ⚠️';
                qualityColor = 'rgba(255, 165, 0, 0.8)'; // 橙色
              } else {
                quality = 'Other ⚠️';
                qualityColor = 'rgba(255, 165, 0, 0.8)'; // 橙色
              }
              
              return `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
                  <td style="padding: 4px; font-weight: bold;">${item.tagName}</td>
                  <td style="padding: 4px; max-width: 60px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${item.text || '(no text)'}">${item.text ? item.text.substring(0, 15) + (item.text.length > 15 ? '...' : '') : '(no text)'}</td>
                  <td style="padding: 4px; font-family: monospace; cursor: pointer; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" class="selector-cell" data-selector="${item.selector.replace(/"/g, '&quot;')}" title="Click to copy: ${item.selector}">${item.selector}</td>
                  <td style="padding: 4px; font-size: 9px; color: ${qualityColor}; font-weight: bold;">${quality}</td>
                  <td style="padding: 4px; font-size: 9px; color: rgba(255,255,255,0.8);">${item.timestamp}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
      
      historyContent.innerHTML = htmlContent;
      
      // Add event delegation for selector cell clicks
      historyContent.addEventListener('click', (e) => {
        if (e.target.classList.contains('selector-cell')) {
          e.preventDefault();
          e.stopPropagation();
          
          const selector = e.target.getAttribute('data-selector');
          if (selector) {
            // Copy to clipboard
            navigator.clipboard.writeText(selector).then(() => {
              // Visual feedback
              const originalBackground = e.target.style.background;
              e.target.style.background = 'rgba(255,255,255,0.2)';
              setTimeout(() => {
                e.target.style.background = originalBackground;
              }, 1000);
            }).catch(err => {
              console.error('Failed to copy to clipboard:', err);
              // Fallback: show alert
              alert('Selector copied: ' + selector);
            });
          }
        }
      });
    }
  } catch (error) {
    console.error('Error loading history:', error);
    historyContent.innerHTML = '<div class="empty-state" style="text-align: center; color: rgba(255,255,255,0.7); padding: 10px; font-style: italic; font-size: 11px;">Error loading history</div>';
  }
}

// Function to check if a selector is unique on the page
function isSelectorUnique(selector) {
  try {
    const elements = document.querySelectorAll(selector);
    return elements.length === 1;
  } catch (e) {
    return false;
  }
}

// Function to generate stable and unique CSS selectors for crawler use
function generateMultipleSelectors(el) {
  const selectors = [];
  
  // 1. ID选择器（最优先，通常唯一）
  if (el.id && el.id.trim()) {
    const idSelector = `#${CSS.escape(el.id)}`;
    if (isSelectorUnique(idSelector)) {
      selectors.push({
        type: 'ID',
        selector: idSelector,
        description: '通过ID选择（最稳定，推荐用于爬虫）',
        priority: 1,
        unique: true,
        stable: true
      });
    }
  }
  
  // 2. 测试相关属性选择器（通常用于自动化测试，很稳定）
  const testAttributes = ['data-testid', 'data-test', 'data-cy', 'data-test-id', 'data-automation-id'];
  testAttributes.forEach(attr => {
    const value = el.getAttribute(attr);
    if (value && value.trim()) {
      const selector = `[${attr}="${CSS.escape(value)}"]`;
      if (isSelectorUnique(selector)) {
        selectors.push({
          type: 'Test Attribute',
          selector: selector,
          description: `通过测试属性${attr}选择（推荐用于爬虫）`,
          priority: 2,
          unique: true,
          stable: true
        });
      }
    }
  });
  
  // 3. 其他重要属性选择器
  const importantAttributes = ['name', 'aria-label', 'title', 'alt', 'href', 'src'];
  importantAttributes.forEach(attr => {
    const value = el.getAttribute(attr);
    if (value && value.trim()) {
      const selector = `[${attr}="${CSS.escape(value)}"]`;
      if (isSelectorUnique(selector)) {
        selectors.push({
          type: 'Attribute',
          selector: selector,
          description: `通过${attr}属性选择`,
          priority: 3,
          unique: true,
          stable: true
        });
      }
    }
  });
  
  // 4. 稳定的class选择器（检查唯一性）
  if (el.className && typeof el.className === 'string') {
    const classes = el.className.trim().split(/\s+/).filter(c => c.length > 0);
    
    // 尝试单个class
    classes.forEach(cls => {
      const selector = `.${CSS.escape(cls)}`;
      if (isSelectorUnique(selector)) {
        selectors.push({
          type: 'Unique Class',
          selector: selector,
          description: `通过唯一class "${cls}" 选择`,
          priority: 4,
          unique: true,
          stable: true
        });
      }
    });
    
    // 尝试多个class组合
    if (classes.length > 1) {
      const multiClassSelector = classes.map(cls => `.${CSS.escape(cls)}`).join('');
      if (isSelectorUnique(multiClassSelector)) {
        selectors.push({
          type: 'Multiple Classes',
          selector: multiClassSelector,
          description: `通过多个class组合选择`,
          priority: 4,
          unique: true,
          stable: true
        });
      }
    }
  }
  
  // 5. 基于父元素的稳定选择器
  const parentSelectors = generateStableParentSelectors(el);
  parentSelectors.forEach((selector, index) => {
    selectors.push({
      type: 'Parent-based',
      selector: selector.selector,
      description: selector.description,
      priority: 5 + index,
      unique: selector.unique,
      stable: selector.stable
    });
  });
  
  // 6. 基于文本内容的唯一选择器（如果文本较短且唯一）
  const text = el.textContent.trim();
  if (text && text.length > 0 && text.length < 30 && !text.includes('\n') && !text.includes('  ')) {
    const textSelector = `${el.tagName.toLowerCase()}:contains("${text}")`;
    // 注意：:contains不是标准CSS，但某些爬虫框架支持
    selectors.push({
      type: 'Text Content',
      selector: textSelector,
      description: `通过文本内容选择（非标准CSS，部分爬虫支持）`,
      priority: 8,
      unique: false,
      stable: false
    });
  }
  
  // 7. 备选方案：基于位置的相对选择器
  const fallbackSelectors = generateFallbackSelectors(el);
  fallbackSelectors.forEach((selector, index) => {
    selectors.push({
      type: 'Fallback',
      selector: selector.selector,
      description: selector.description,
      priority: 9 + index,
      unique: selector.unique,
      stable: false
    });
  });
  
  // 按优先级排序，优先显示唯一且稳定的选择器
  selectors.sort((a, b) => {
    if (a.unique && !b.unique) return -1;
    if (!a.unique && b.unique) return 1;
    if (a.stable && !b.stable) return -1;
    if (!a.stable && b.stable) return 1;
    return a.priority - b.priority;
  });
  
  return selectors;
}

// 生成基于父元素的稳定选择器
function generateStableParentSelectors(el) {
  const selectors = [];
  let parent = el.parentElement;
  let level = 1;
  
  while (parent && level <= 3) {
    // 如果父元素有ID，使用父元素ID + 子元素标签
    if (parent.id && parent.id.trim()) {
      const selector = `#${CSS.escape(parent.id)} > ${el.tagName.toLowerCase()}`;
      if (isSelectorUnique(selector)) {
        selectors.push({
          selector: selector,
          description: `通过父元素ID选择（${level}级父元素）`,
          unique: true,
          stable: true
        });
      }
    }
    
    // 如果父元素有稳定的class，使用父元素class + 子元素标签
    if (parent.className && typeof parent.className === 'string') {
      const parentClasses = parent.className.trim().split(/\s+/).filter(c => c.length > 0);
      for (const cls of parentClasses) {
        const selector = `.${CSS.escape(cls)} > ${el.tagName.toLowerCase()}`;
        if (isSelectorUnique(selector)) {
          selectors.push({
            selector: selector,
            description: `通过父元素class选择（${level}级父元素）`,
            unique: true,
            stable: true
          });
          break; // 找到一个稳定的就够了
        }
      }
    }
    
    // 如果父元素有测试属性，使用测试属性 + 子元素标签
    const testAttributes = ['data-testid', 'data-test', 'data-cy'];
    for (const attr of testAttributes) {
      const value = parent.getAttribute(attr);
      if (value && value.trim()) {
        const selector = `[${attr}="${CSS.escape(value)}"] > ${el.tagName.toLowerCase()}`;
        if (isSelectorUnique(selector)) {
          selectors.push({
            selector: selector,
            description: `通过父元素测试属性选择（${level}级父元素）`,
            unique: true,
            stable: true
          });
          break;
        }
      }
    }
    
    parent = parent.parentElement;
    level++;
  }
  
  return selectors;
}

// 生成备选选择器（当没有稳定选择器时使用）
function generateFallbackSelectors(el) {
  const selectors = [];
  
  // 基于标签名和文本内容的组合
  const text = el.textContent.trim();
  if (text && text.length > 0 && text.length < 50) {
    const textSelector = `${el.tagName.toLowerCase()}:contains("${text}")`;
    selectors.push({
      selector: textSelector,
      description: `基于标签和文本内容（非标准CSS）`,
      unique: false,
      stable: false
    });
  }
  
  // 基于标签名和属性的组合
  const attributes = ['type', 'role', 'aria-label'];
  for (const attr of attributes) {
    const value = el.getAttribute(attr);
    if (value && value.trim()) {
      const selector = `${el.tagName.toLowerCase()}[${attr}="${CSS.escape(value)}"]`;
      selectors.push({
        selector: selector,
        description: `基于标签和${attr}属性`,
        unique: false,
        stable: true
      });
    }
  }
  
  // 基于位置的相对选择器（最后的选择）
  const positionSelector = generatePositionSelector(el);
  if (positionSelector) {
    selectors.push({
      selector: positionSelector,
      description: `基于位置的选择器（不稳定，不推荐）`,
      unique: false,
      stable: false
    });
  }
  
  return selectors;
}

// 生成基于位置的选择器（不推荐，但作为最后备选）
function generatePositionSelector(el) {
  const path = [];
  let current = el;
  
  while (current && current.nodeType === Node.ELEMENT_NODE && path.length < 4) {
    let selector = current.tagName.toLowerCase();
    
    // 计算在同类型兄弟元素中的位置
    let position = 1;
    let sibling = current.previousElementSibling;
    while (sibling) {
      if (sibling.tagName === current.tagName) {
        position++;
      }
      sibling = sibling.previousElementSibling;
    }
    
    if (position > 1) {
      selector += `:nth-of-type(${position})`;
    }
    
    path.unshift(selector);
    current = current.parentElement;
  }
  
  return path.length > 1 ? path.join(' > ') : null;
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
    const bestSelector = selectors[0];
    const selectorInfo = bestSelector ? 
      `${bestSelector.selector} ${bestSelector.unique ? '✅' : '⚠️'} ${bestSelector.stable ? '🔒' : '⚠️'}` : 
      'N/A';
    
    elementDetails.innerHTML = `
      <div style="margin-bottom: 3px;"><strong>Tag:</strong> ${element.tagName.toLowerCase()}</div>
      <div style="margin-bottom: 3px;"><strong>Text:</strong> ${text}${element.textContent.length > 100 ? '...' : ''}</div>
      <div style="margin-bottom: 3px;"><strong>Best Selector:</strong> ${selectorInfo}</div>
      <div style="margin-top: 5px; font-size: 10px; opacity: 0.8;">
        Click to select • ESC to cancel<br>
        ✅ Unique • 🔒 Stable • ⚠️ Not recommended
      </div>
    `;
  }
  
  // Show info panel
  infoPanel.style.display = 'block';
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
  
  // Load history with a small delay to ensure DOM is ready
  setTimeout(() => {
    loadAndDisplayHistory();
  }, 10);

  // Mouse move handler
  window.clickScrapeMouseMove = function(event) {
    if (!window.clickScrapeActive) return;
    
    // Skip element detection if mouse is over the info panel
    if (window.clickScrapePanelHover) {
      return;
    }
    
    const element = document.elementFromPoint(event.clientX, event.clientY);
    
    // Double-check that the element is not part of the info panel
    if (element && element.closest('#click-scrape-info')) {
      return;
    }
    
    if (element && element !== currentElement) {
      currentElement = element;
      highlightElement(element, highlightBox, infoPanel);
    }
  };

  // Click handler
  window.clickScrapeClick = function(event) {
    if (!window.clickScrapeActive) return;
    
    // Skip if mouse is over panel or click is on panel
    if (window.clickScrapePanelHover) {
      return;
    }
    
    // Check if the click is on a button in the info panel
    const target = event.target;
    if (target && (target.id === 'clear-history' || target.id === 'close-panel' || target.closest('#click-scrape-info'))) {
      // Don't handle clicks on panel buttons
      return;
    }
    
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
    window.clickScrapePanelHover = false; // Reset panel hover state
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
  
  