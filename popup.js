document.addEventListener('DOMContentLoaded', function() {
  const startBtn = document.getElementById('startSelection');
  const stopBtn = document.getElementById('stopSelection');
  const captureBtn = document.getElementById('captureData');
  const descriptionSection = document.getElementById('descriptionSection');
  const statusDiv = document.getElementById('status');
  const descriptionTextarea = document.getElementById('description');

  let isSelecting = false;
  let currentTabId = null;

  // 获取当前活动标签页
  async function getCurrentTab() {
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    return tab;
  }

  // 更新状态显示
  function updateStatus(message, type = 'normal') {
    statusDiv.textContent = message;
    statusDiv.className = '';
    if (type === 'active') {
      statusDiv.classList.add('status-active');
    } else if (type === 'error') {
      statusDiv.classList.add('status-error');
    }
  }

  // 开始选择区域
  startBtn.addEventListener('click', async function() {
    try {
      const tab = await getCurrentTab();
      currentTabId = tab.id;

      // 向内容脚本发送开始选择的消息
      await chrome.tabs.sendMessage(currentTabId, {action: 'startSelection'});
      
      isSelecting = true;
      startBtn.style.display = 'none';
      stopBtn.style.display = 'block';
      updateStatus('正在选择区域...点击并拖拽网页区域', 'active');
      
    } catch (error) {
      console.error('Error starting selection:', error);
      updateStatus('启动选择失败，请刷新页面后重试', 'error');
    }
  });

  // 停止选择区域
  stopBtn.addEventListener('click', async function() {
    try {
      if (currentTabId) {
        await chrome.tabs.sendMessage(currentTabId, {action: 'stopSelection'});
      }
      
      isSelecting = false;
      startBtn.style.display = 'block';
      stopBtn.style.display = 'none';
      descriptionSection.style.display = 'none';
      updateStatus('已停止选择');
      
    } catch (error) {
      console.error('Error stopping selection:', error);
      updateStatus('停止选择时出错', 'error');
    }
  });

  // 抓取数据
  captureBtn.addEventListener('click', async function() {
    try {
      const description = descriptionTextarea.value.trim();
      if (!description) {
        updateStatus('请先添加描述', 'error');
        return;
      }

      if (currentTabId) {
        await chrome.tabs.sendMessage(currentTabId, {
          action: 'captureData',
          description: description
        });
        
        updateStatus('数据已抓取并输出到控制台', 'active');
        descriptionTextarea.value = '';
        descriptionSection.style.display = 'none';
      }
      
    } catch (error) {
      console.error('Error capturing data:', error);
      updateStatus('抓取数据失败', 'error');
    }
  });

  // 监听来自内容脚本的消息
  chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.action === 'selectionComplete') {
      descriptionSection.style.display = 'block';
      updateStatus('区域选择完成，请添加描述');
    } else if (message.action === 'selectionCancelled') {
      isSelecting = false;
      startBtn.style.display = 'block';
      stopBtn.style.display = 'none';
      descriptionSection.style.display = 'none';
      updateStatus('选择已取消');
    }
  });

  // 初始化状态
  updateStatus('准备就绪');
});