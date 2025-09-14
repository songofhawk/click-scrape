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

// Show copy success message
function showCopySuccessMessage(selector) {
  // Find the info panel
  const infoPanel = document.getElementById('click-scrape-info');
  if (!infoPanel) return;
  
  // Create or find the message container
  let messageContainer = infoPanel.querySelector('#copy-success-message');
  if (!messageContainer) {
    messageContainer = document.createElement('div');
    messageContainer.id = 'copy-success-message';
    messageContainer.style.cssText = `
      position: absolute;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(255,255,255,0.25);
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      border: 1px solid rgba(144, 238, 144, 0.6);
      font-size: 11px;
      font-weight: bold;
      z-index: 1000002;
      display: none;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      white-space: nowrap;
      max-width: 300px;
      overflow: hidden;
      text-overflow: ellipsis;
      backdrop-filter: blur(4px);
    `;
    infoPanel.appendChild(messageContainer);
  }
  
  // Show the message
  messageContainer.textContent = `✅ Copied: ${selector.length > 30 ? selector.substring(0, 30) + '...' : selector}`;
  messageContainer.style.display = 'block';
  
  // Hide after 2 seconds
  setTimeout(() => {
    messageContainer.style.display = 'none';
  }, 2000);
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
              // Show success message in the panel
              showCopySuccessMessage(selector);
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

// 检测元素是否在相似的兄弟元素列表中
function isElementInSimilarSiblingsList(el) {
  const parent = el.parentElement;
  if (!parent) return false;
  
  const siblings = Array.from(parent.children);
  if (siblings.length < 2) return false;
  
  // 获取当前元素的兄弟元素
  const sameLevelElements = siblings.filter(sibling => 
    sibling.tagName === el.tagName && sibling !== el
  );
  
  if (sameLevelElements.length === 0) return false;
  
  // 检查是否为列表项或表格行等典型的重复结构
  const isListLike = /^(li|tr|td|th|option|article|section|div)$/i.test(el.tagName);
  if (isListLike && sameLevelElements.length >= 1) {
    return true;
  }
  
  // 检查兄弟元素是否有相似的结构特征
  const currentElementFeatures = getElementStructuralFeatures(el);
  const similarSiblings = sameLevelElements.filter(sibling => {
    const siblingFeatures = getElementStructuralFeatures(sibling);
    return areFeaturesStructurallySimilar(currentElementFeatures, siblingFeatures);
  });
  
  // 如果有2个或更多相似的兄弟元素，认为是在列表中
  return similarSiblings.length >= 1;
}

// 获取元素的结构特征
function getElementStructuralFeatures(el) {
  return {
    tagName: el.tagName,
    childElementCount: el.children.length,
    hasClass: el.className && el.className.trim().length > 0,
    classNames: el.className ? el.className.trim().split(/\s+/).sort() : [],
    hasId: el.id && el.id.trim().length > 0,
    hasAttributes: el.attributes.length > 0,
    hasText: el.textContent && el.textContent.trim().length > 0,
    childTagNames: Array.from(el.children).map(child => child.tagName).sort()
  };
}

// 判断两个元素的结构特征是否相似
function areFeaturesStructurallySimilar(features1, features2) {
  // 标签名必须相同
  if (features1.tagName !== features2.tagName) return false;
  
  // 子元素数量差异不能太大
  const childCountDiff = Math.abs(features1.childElementCount - features2.childElementCount);
  if (childCountDiff > 2) return false;
  
  // 至少有一个共同点：相同的class、相似的子元素结构等
  const hasCommonClasses = features1.classNames.some(cls => features2.classNames.includes(cls));
  const hasSimilarChildStructure = 
    features1.childTagNames.length === features2.childTagNames.length &&
    features1.childTagNames.every((tag, index) => tag === features2.childTagNames[index]);
  
  return hasCommonClasses || hasSimilarChildStructure || 
         (features1.childElementCount === features2.childElementCount);
}

// 生成基于父元素和索引的选择器
function generateParentBasedIndexSelector(el) {
  const parent = el.parentElement;
  if (!parent) return null;
  
  const selectors = [];
  
  // 计算元素在同标签兄弟中的索引
  const siblings = Array.from(parent.children).filter(child => child.tagName === el.tagName);
  const index = siblings.indexOf(el) + 1; // CSS中索引从1开始
  
  // 方案1：父元素ID + 子元素标签:nth-of-type
  if (parent.id && parent.id.trim()) {
    const selector = `#${CSS.escape(parent.id)} > ${el.tagName.toLowerCase()}:nth-of-type(${index})`;
    if (isSelectorUnique(selector)) {
      selectors.push({
        type: 'Parent ID + Index',
        selector: selector,
        description: `通过父元素ID和第${index}个${el.tagName.toLowerCase()}选择（推荐）`,
        priority: 2,
        unique: true,
        stable: true
      });
    }
  }
  
  // 方案2：父元素class + 子元素标签:nth-of-type
  if (parent.className && typeof parent.className === 'string') {
    const parentClasses = parent.className.trim().split(/\s+/).filter(c => c.length > 0);
    for (const cls of parentClasses) {
      const selector = `.${CSS.escape(cls)} > ${el.tagName.toLowerCase()}:nth-of-type(${index})`;
      if (isSelectorUnique(selector)) {
        selectors.push({
          type: 'Parent Class + Index',
          selector: selector,
          description: `通过父元素class和第${index}个${el.tagName.toLowerCase()}选择`,
          priority: 3,
          unique: true,
          stable: true
        });
        break; // 只需要一个有效的class选择器
      }
    }
  }
  
  // 方案3：父元素测试属性 + 子元素标签:nth-of-type
  const testAttributes = ['data-testid', 'data-test', 'data-cy'];
  for (const attr of testAttributes) {
    const value = parent.getAttribute(attr);
    if (value && value.trim()) {
      const selector = `[${attr}="${CSS.escape(value)}"] > ${el.tagName.toLowerCase()}:nth-of-type(${index})`;
      if (isSelectorUnique(selector)) {
        selectors.push({
          type: 'Parent Test Attr + Index',
          selector: selector,
          description: `通过父元素测试属性和第${index}个${el.tagName.toLowerCase()}选择`,
          priority: 2,
          unique: true,
          stable: true
        });
        break;
      }
    }
  }
  
  // 方案4：通用的:nth-child选择器（相对不稳定）
  const childIndex = Array.from(parent.children).indexOf(el) + 1;
  const fallbackSelector = `${parent.tagName.toLowerCase()} > ${el.tagName.toLowerCase()}:nth-child(${childIndex})`;
  selectors.push({
    type: 'Position Index',
    selector: fallbackSelector,
    description: `通过位置索引选择（第${childIndex}个子元素，相对不稳定）`,
    priority: 8,
    unique: false,
    stable: false
  });
  
  return selectors;
}

// 新的CSS选择器生成算法 - 确保全局唯一性
function generateMultipleSelectors(el) {
  const selectors = [];
  
  // 1. 直接唯一标识符检测
  const directSelectors = generateDirectSelectors(el);
  selectors.push(...directSelectors);
  
  // 如果已经有唯一的直接选择器，可以提前返回，但我们继续生成备选方案
  
  // 2. 基于祖先的唯一路径选择器
  const ancestorBasedSelectors = generateAncestorBasedSelectors(el);
  selectors.push(...ancestorBasedSelectors);
  
  // 3. 处理相似兄弟元素的特殊情况
  const siblingAwareSelectors = generateSiblingAwareSelectors(el);
  selectors.push(...siblingAwareSelectors);
  
  // 4. 备选方案：完整结构路径
  const fallbackSelectors = generateStructuralPathSelectors(el);
  selectors.push(...fallbackSelectors);
  
  // 5. 验证所有选择器的唯一性并排序
  return validateAndSortSelectors(selectors, el);
}

// 生成直接选择器（ID、唯一属性等）
function generateDirectSelectors(el) {
  const selectors = [];
  
  // 1.1 ID选择器（最优先）
  if (el.id && el.id.trim()) {
    const idSelector = `#${CSS.escape(el.id)}`;
    if (isSelectorUnique(idSelector)) {
      selectors.push({
        type: 'ID',
        selector: idSelector,
        description: '通过ID选择（最稳定，推荐用于爬虫）',
        priority: 1,
        unique: true,
        stable: true,
        specificity: 100
      });
    }
  }
  
  // 1.2 测试属性选择器
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
          stable: true,
          specificity: 10
        });
      }
    }
  });
  
  // 1.3 其他唯一属性选择器
  const uniqueAttributes = ['name', 'aria-label', 'title', 'alt', 'href', 'src'];
  uniqueAttributes.forEach(attr => {
    const value = el.getAttribute(attr);
    if (value && value.trim()) {
      const selector = `[${attr}="${CSS.escape(value)}"]`;
      if (isSelectorUnique(selector)) {
        selectors.push({
          type: 'Unique Attribute',
          selector: selector,
          description: `通过${attr}属性选择`,
          priority: 3,
          unique: true,
          stable: true,
          specificity: 10
        });
      }
    }
  });
  
  // 1.4 唯一class选择器
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
          stable: true,
          specificity: 10
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
          stable: true,
          specificity: 10 * classes.length
        });
      }
    }
  }
  
  return selectors;
}

// 生成基于祖先的选择器
function generateAncestorBasedSelectors(el) {
  const selectors = [];
  const path = [];
  let current = el;
  let foundUniqueAncestor = false;
  
  // 向上遍历DOM树，寻找有唯一标识的祖先
  while (current && current !== document.body && path.length < 10) {
    const stepInfo = getElementStepInfo(current);
    path.unshift(stepInfo);
    
    // 检查当前路径是否已经唯一
    if (stepInfo.isUnique) {
      foundUniqueAncestor = true;
      break;
    }
    
    current = current.parentElement;
  }
  
  // 如果找到了唯一祖先，构建选择器
  if (foundUniqueAncestor && path.length > 1) {
    const uniqueRoot = path[0];
    const pathFromRoot = path.slice(1);
    
    // 方案1：使用直接子选择器
    const directChildSelector = uniqueRoot.selector + ' > ' + 
      pathFromRoot.map(step => step.directSelector).join(' > ');
    
    if (isSelectorUnique(directChildSelector)) {
      selectors.push({
        type: 'Ancestor Direct Path',
        selector: directChildSelector,
        description: `通过唯一祖先${uniqueRoot.type}的直接路径选择`,
        priority: 5,
        unique: true,
        stable: true,
        specificity: uniqueRoot.specificity + pathFromRoot.length
      });
    }
    
    // 方案2：使用后代选择器（更宽松）
    const descendantSelector = uniqueRoot.selector + ' ' + 
      pathFromRoot.map(step => step.flexibleSelector).join(' ');
    
    if (isSelectorUnique(descendantSelector) && descendantSelector !== directChildSelector) {
      selectors.push({
        type: 'Ancestor Descendant Path',
        selector: descendantSelector,
        description: `通过唯一祖先${uniqueRoot.type}的后代路径选择`,
        priority: 6,
        unique: true,
        stable: true,
        specificity: uniqueRoot.specificity + pathFromRoot.length * 0.5
      });
    }
  }
  
  return selectors;
}

// 获取元素的路径步骤信息
function getElementStepInfo(el) {
  const stepInfo = {
    element: el,
    tagName: el.tagName.toLowerCase(),
    isUnique: false,
    specificity: 1,
    directSelector: el.tagName.toLowerCase(),
    flexibleSelector: el.tagName.toLowerCase()
  };
  
  // 检查ID
  if (el.id && el.id.trim()) {
    const idSelector = `#${CSS.escape(el.id)}`;
    if (isSelectorUnique(idSelector)) {
      stepInfo.selector = idSelector;
      stepInfo.type = 'ID';
      stepInfo.isUnique = true;
      stepInfo.specificity = 100;
      stepInfo.directSelector = idSelector;
      stepInfo.flexibleSelector = idSelector;
      return stepInfo;
    }
  }
  
  // 检查测试属性
  const testAttributes = ['data-testid', 'data-test', 'data-cy'];
  for (const attr of testAttributes) {
    const value = el.getAttribute(attr);
    if (value && value.trim()) {
      const selector = `[${attr}="${CSS.escape(value)}"]`;
      if (isSelectorUnique(selector)) {
        stepInfo.selector = selector;
        stepInfo.type = 'Test Attribute';
        stepInfo.isUnique = true;
        stepInfo.specificity = 50;
        stepInfo.directSelector = selector;
        stepInfo.flexibleSelector = selector;
        return stepInfo;
      }
    }
  }
  
  // 检查唯一class
  if (el.className && typeof el.className === 'string') {
    const classes = el.className.trim().split(/\s+/).filter(c => c.length > 0);
    
    for (const cls of classes) {
      const selector = `.${CSS.escape(cls)}`;
      if (isSelectorUnique(selector)) {
        stepInfo.selector = selector;
        stepInfo.type = 'Unique Class';
        stepInfo.isUnique = true;
        stepInfo.specificity = 30;
        stepInfo.directSelector = selector;
        stepInfo.flexibleSelector = selector;
        return stepInfo;
      }
    }
    
    // 使用第一个class作为灵活选择器
    if (classes.length > 0) {
      stepInfo.flexibleSelector = `${el.tagName.toLowerCase()}.${CSS.escape(classes[0])}`;
      stepInfo.specificity = 2;
    }
  }
  
  // 如果需要索引来区分兄弟元素
  const siblings = Array.from(el.parentElement?.children || []);
  const sameTagSiblings = siblings.filter(sibling => sibling.tagName === el.tagName);
  
  if (sameTagSiblings.length > 1) {
    const index = sameTagSiblings.indexOf(el) + 1;
    stepInfo.directSelector = `${el.tagName.toLowerCase()}:nth-of-type(${index})`;
    stepInfo.specificity = 2;
  }
  
  return stepInfo;
}

// 生成兄弟元素感知的选择器
function generateSiblingAwareSelectors(el) {
  const selectors = [];
  
  // 检查是否在相似的兄弟元素列表中
  if (isElementInSimilarSiblingsList(el)) {
    const parentIndexSelectors = generateParentBasedIndexSelector(el);
    selectors.push(...parentIndexSelectors);
  }
  
  return selectors;
}

// 生成结构路径选择器（备选方案）
function generateStructuralPathSelectors(el) {
  const selectors = [];
  
  // 生成完整的结构路径（作为最后的备选方案）
  const fullPath = generateFullStructuralPath(el);
  if (fullPath && isSelectorUnique(fullPath)) {
    selectors.push({
      type: 'Full Structural Path',
      selector: fullPath,
      description: '完整结构路径（备选方案）',
      priority: 15,
      unique: true,
      stable: false,
      specificity: fullPath.split(' ').length
    });
  }
  
  // 基于文本内容的选择器（仅作为最后备选）
  const text = el.textContent.trim();
  if (text && text.length > 0 && text.length < 30 && !text.includes('\n')) {
    const textSelector = `${el.tagName.toLowerCase()}:contains("${text}")`;
    selectors.push({
      type: 'Text Content',
      selector: textSelector,
      description: '基于文本内容选择（非标准CSS，不推荐）',
      priority: 20,
      unique: false,
      stable: false,
      specificity: 1
    });
  }
  
  return selectors;
}

// 生成完整的结构路径
function generateFullStructuralPath(el) {
  const path = [];
  let current = el;
  
  while (current && current !== document.body && path.length < 15) {
    let selector = current.tagName.toLowerCase();
    
    // 添加class信息（如果有）
    if (current.className && typeof current.className === 'string') {
      const classes = current.className.trim().split(/\s+/).filter(c => c.length > 0);
      if (classes.length > 0) {
        selector += `.${CSS.escape(classes[0])}`;
      }
    }
    
    // 添加nth-child信息（如果有多个相同元素）
    const siblings = Array.from(current.parentElement?.children || []);
    const sameTagSiblings = siblings.filter(sibling => sibling.tagName === current.tagName);
    
    if (sameTagSiblings.length > 1) {
      const index = sameTagSiblings.indexOf(current) + 1;
      selector += `:nth-of-type(${index})`;
    }
    
    path.unshift(selector);
    current = current.parentElement;
  }
  
  return path.length > 0 ? path.join(' > ') : null;
}

// 验证并排序选择器
function validateAndSortSelectors(selectors, targetElement) {
  // 过滤出确实唯一的选择器
  const validSelectors = selectors.filter(selectorObj => {
    try {
      const elements = document.querySelectorAll(selectorObj.selector);
      return elements.length === 1 && elements[0] === targetElement;
    } catch (e) {
      console.warn('Invalid selector:', selectorObj.selector, e);
      return false;
    }
  });
  
  // 按优先级和特异性排序
  validSelectors.sort((a, b) => {
    // 首先按优先级排序
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    
    // 如果优先级相同，按特异性排序（特异性高的优先）
    if (a.specificity !== b.specificity) {
      return b.specificity - a.specificity;
    }
    
    // 最后按选择器长度排序（短的优先）
    return a.selector.length - b.selector.length;
  });
  
  return validSelectors;
}

// 生成基于父元素的稳定选择器（保留原有函数，用于兼容）
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
    
    parent = parent.parentElement;
    level++;
  }
  
  return selectors;
}

// 生成备选方案选择器
function generateFallbackSelectors(el) {
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
      
      // Auto-copy best selector to clipboard
      const bestSelector = selectors[0] ? selectors[0].selector : '';
      if (bestSelector) {
        navigator.clipboard.writeText(bestSelector).then(() => {
          console.log('Selector auto-copied to clipboard:', bestSelector);
        }).catch(err => {
          console.error('Failed to auto-copy selector to clipboard:', err);
        });
      }
      
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
          <div style="color: #87CEEB; font-size: 10px; margin-bottom: 3px;">📋 Selector auto-copied to clipboard!</div>
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
  
  