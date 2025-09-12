// Alpha Plugin Content Script

class AlphaPluginSelector {
  constructor() {
    this.isSelecting = false;
    this.startX = 0;
    this.startY = 0;
    this.endX = 0;
    this.endY = 0;
    this.overlay = null;
    this.selectionBox = null;
    this.toolbar = null;
    this.selectedElements = [];
    this.selectionInfo = null;
    
    this.bindEvents();
    console.log('Alpha Plugin Content Script loaded');
  }

  bindEvents() {
    // 监听来自popup的消息
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch(message.action) {
        case 'startSelection':
          this.startSelection();
          break;
        case 'stopSelection':
          this.stopSelection();
          break;
        case 'captureData':
          this.captureData(message.description);
          break;
      }
    });
  }

  startSelection() {
    if (this.isSelecting) return;
    
    this.isSelecting = true;
    this.createOverlay();
    this.createToolbar();
    this.addEventListeners();
    console.log('Started area selection mode');
  }

  stopSelection() {
    if (!this.isSelecting) return;
    
    this.isSelecting = false;
    this.removeOverlay();
    this.removeToolbar();
    this.removeEventListeners();
    this.selectedElements = [];
    console.log('Stopped area selection mode');
    
    // 通知popup选择已取消
    chrome.runtime.sendMessage({action: 'selectionCancelled'});
  }

  createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'alpha-plugin-overlay';
    document.body.appendChild(this.overlay);
  }

  createToolbar() {
    this.toolbar = document.createElement('div');
    this.toolbar.className = 'alpha-plugin-toolbar';
    this.toolbar.innerHTML = `
      <div class="alpha-plugin-toolbar-title">Alpha Plugin - 区域选择</div>
      <div class="alpha-plugin-toolbar-instructions">点击并拖拽以选择区域</div>
      <button class="alpha-plugin-toolbar-button" id="alpha-cancel-btn">取消</button>
    `;
    
    document.body.appendChild(this.toolbar);
    
    // 绑定取消按钮
    const cancelBtn = this.toolbar.querySelector('#alpha-cancel-btn');
    cancelBtn.addEventListener('click', () => this.stopSelection());
  }

  removeOverlay() {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    if (this.selectionBox) {
      this.selectionBox.remove();
      this.selectionBox = null;
    }
    if (this.selectionInfo) {
      this.selectionInfo.remove();
      this.selectionInfo = null;
    }
  }

  removeToolbar() {
    if (this.toolbar) {
      this.toolbar.remove();
      this.toolbar = null;
    }
  }

  addEventListeners() {
    this.mouseDownHandler = this.onMouseDown.bind(this);
    this.mouseMoveHandler = this.onMouseMove.bind(this);
    this.mouseUpHandler = this.onMouseUp.bind(this);
    this.keyDownHandler = this.onKeyDown.bind(this);

    this.overlay.addEventListener('mousedown', this.mouseDownHandler);
    document.addEventListener('mousemove', this.mouseMoveHandler);
    document.addEventListener('mouseup', this.mouseUpHandler);
    document.addEventListener('keydown', this.keyDownHandler);
  }

  removeEventListeners() {
    if (this.overlay) {
      this.overlay.removeEventListener('mousedown', this.mouseDownHandler);
    }
    document.removeEventListener('mousemove', this.mouseMoveHandler);
    document.removeEventListener('mouseup', this.mouseUpHandler);
    document.removeEventListener('keydown', this.keyDownHandler);
  }

  onMouseDown(e) {
    e.preventDefault();
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.createSelectionBox();
  }

  onMouseMove(e) {
    if (!this.selectionBox) return;
    
    this.endX = e.clientX;
    this.endY = e.clientY;
    this.updateSelectionBox();
  }

  onMouseUp(e) {
    if (!this.selectionBox) return;
    
    this.endX = e.clientX;
    this.endY = e.clientY;
    this.finalizeSelection();
  }

  onKeyDown(e) {
    if (e.key === 'Escape') {
      this.stopSelection();
    }
  }

  createSelectionBox() {
    this.selectionBox = document.createElement('div');
    this.selectionBox.className = 'alpha-plugin-selection-box';
    document.body.appendChild(this.selectionBox);
    
    this.selectionInfo = document.createElement('div');
    this.selectionInfo.className = 'alpha-plugin-selection-info';
    document.body.appendChild(this.selectionInfo);
  }

  updateSelectionBox() {
    const left = Math.min(this.startX, this.endX);
    const top = Math.min(this.startY, this.endY);
    const width = Math.abs(this.endX - this.startX);
    const height = Math.abs(this.endY - this.startY);

    this.selectionBox.style.left = left + 'px';
    this.selectionBox.style.top = top + 'px';
    this.selectionBox.style.width = width + 'px';
    this.selectionBox.style.height = height + 'px';

    // 更新信息显示
    this.selectionInfo.textContent = `${width} × ${height} px`;
    this.selectionInfo.style.left = (left + width + 5) + 'px';
    this.selectionInfo.style.top = top + 'px';
    
    // 确保信息框不超出屏幕
    const infoRect = this.selectionInfo.getBoundingClientRect();
    if (infoRect.right > window.innerWidth) {
      this.selectionInfo.style.left = (left - infoRect.width - 5) + 'px';
    }
    if (infoRect.bottom > window.innerHeight) {
      this.selectionInfo.style.top = (top - infoRect.height - 5) + 'px';
    }
  }

  finalizeSelection() {
    const left = Math.min(this.startX, this.endX);
    const top = Math.min(this.startY, this.endY);
    const width = Math.abs(this.endX - this.startX);
    const height = Math.abs(this.endY - this.startY);

    // 如果选择区域太小，忽略
    if (width < 10 || height < 10) {
      this.removeSelectionBox();
      return;
    }

    // 找到选择区域内的元素
    this.findElementsInSelection(left, top, width, height);
    
    // 移除覆盖层但保留选择框
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    
    this.removeEventListeners();
    this.isSelecting = false;
    
    // 通知popup选择完成
    chrome.runtime.sendMessage({action: 'selectionComplete'});
    
    console.log('Selection finalized:', {
      area: {left, top, width, height},
      elements: this.selectedElements.length
    });
  }

  removeSelectionBox() {
    if (this.selectionBox) {
      this.selectionBox.remove();
      this.selectionBox = null;
    }
    if (this.selectionInfo) {
      this.selectionInfo.remove();
      this.selectionInfo = null;
    }
  }

  findElementsInSelection(left, top, width, height) {
    this.selectedElements = [];
    const right = left + width;
    const bottom = top + height;

    // 获取所有可见元素
    const allElements = document.querySelectorAll('*:not(.alpha-plugin-overlay):not(.alpha-plugin-selection-box):not(.alpha-plugin-selection-info):not(.alpha-plugin-toolbar)');
    
    allElements.forEach(element => {
      const rect = element.getBoundingClientRect();
      
      // 检查元素是否在选择区域内
      if (rect.left >= left && rect.top >= top && 
          rect.right <= right && rect.bottom <= bottom &&
          rect.width > 0 && rect.height > 0) {
        
        // 避免选择父元素如果子元素已被选择
        const hasSelectedChild = this.selectedElements.some(selectedEl => 
          element.contains(selectedEl.element)
        );
        
        if (!hasSelectedChild) {
          this.selectedElements.push({
            element: element,
            rect: rect,
            tagName: element.tagName,
            className: element.className,
            id: element.id,
            textContent: element.textContent?.trim().substring(0, 100) || '',
            innerHTML: element.innerHTML
          });
          
          // 高亮显示选中的元素
          element.classList.add('alpha-plugin-highlighted-element');
        }
      }
    });

    console.log(`Found ${this.selectedElements.length} elements in selection`);
  }

  captureData(description) {
    if (this.selectedElements.length === 0) {
      console.log('No elements selected for data capture');
      return;
    }

    // 清理高亮显示
    this.selectedElements.forEach(item => {
      item.element.classList.remove('alpha-plugin-highlighted-element');
    });

    // 准备要输出的数据
    const capturedData = {
      timestamp: new Date().toISOString(),
      description: description,
      url: window.location.href,
      title: document.title,
      selectedArea: {
        elements: this.selectedElements.length,
        data: this.selectedElements.map(item => ({
          tagName: item.tagName,
          id: item.id,
          className: item.className,
          textContent: item.textContent,
          coordinates: {
            left: item.rect.left,
            top: item.rect.top,
            width: item.rect.width,
            height: item.rect.height
          },
          attributes: this.getElementAttributes(item.element),
          computedStyles: this.getImportantStyles(item.element)
        }))
      }
    };

    // 输出到控制台
    console.group('🎯 Alpha Plugin - 数据抓取结果');
    console.log('📝 描述:', description);
    console.log('🌐 页面URL:', window.location.href);
    console.log('📊 抓取的元素数量:', this.selectedElements.length);
    console.log('📋 详细数据:', capturedData);
    console.table(capturedData.selectedArea.data.map(item => ({
      '标签': item.tagName,
      'ID': item.id,
      '类名': item.className,
      '文本内容': item.textContent.substring(0, 50) + (item.textContent.length > 50 ? '...' : ''),
      '位置': `${Math.round(item.coordinates.left)}, ${Math.round(item.coordinates.top)}`,
      '尺寸': `${Math.round(item.coordinates.width)} × ${Math.round(item.coordinates.height)}`
    })));
    console.groupEnd();

    // 清理选择状态
    this.removeSelectionBox();
    this.removeToolbar();
    this.selectedElements = [];

    // 发送数据到后台脚本（可选）
    chrome.runtime.sendMessage({
      action: 'logData',
      data: capturedData
    });
  }

  getElementAttributes(element) {
    const attributes = {};
    Array.from(element.attributes).forEach(attr => {
      attributes[attr.name] = attr.value;
    });
    return attributes;
  }

  getImportantStyles(element) {
    const computedStyle = window.getComputedStyle(element);
    return {
      display: computedStyle.display,
      position: computedStyle.position,
      color: computedStyle.color,
      backgroundColor: computedStyle.backgroundColor,
      fontSize: computedStyle.fontSize,
      fontFamily: computedStyle.fontFamily,
      visibility: computedStyle.visibility,
      zIndex: computedStyle.zIndex
    };
  }
}

// 初始化插件
if (!window.alphaPluginSelector) {
  window.alphaPluginSelector = new AlphaPluginSelector();
}