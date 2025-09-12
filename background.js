// Alpha Plugin Background Script

chrome.runtime.onInstalled.addListener(function() {
  console.log('Alpha Plugin installed successfully');
});

// 处理插件图标点击
chrome.action.onClicked.addListener(function(tab) {
  // 这里可以添加额外的逻辑，但主要功能在popup中处理
});

// 监听来自内容脚本和popup的消息
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  switch(message.action) {
    case 'logData':
      // 在后台脚本中记录数据（可选）
      console.log('Captured data from tab:', sender.tab.id, message.data);
      break;
      
    case 'getTabInfo':
      // 返回标签页信息
      if (sender.tab) {
        sendResponse({
          tabId: sender.tab.id,
          url: sender.tab.url,
          title: sender.tab.title
        });
      }
      break;
  }
});

// 处理标签页更新
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete') {
    // 页面加载完成，可以进行初始化
    console.log('Page loaded:', tab.url);
  }
});