// Background script for Click & Scrape extension
// This script runs in the background and handles extension lifecycle events

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Click & Scrape extension installed');
});

// Handle extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // Inject content.js script into the active tab
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
    
    // Send message to start selection
    await chrome.tabs.sendMessage(tab.id, { action: 'startSelection' });
    
    console.log('Element selection started for tab:', tab.id);
  } catch (error) {
    console.error('Error starting element selection:', error);
  }
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'elementClicked') {
    // Log the scraped data to the background console
    console.log('Element clicked:', request.data);
  }
  
  // Send response back if needed
  sendResponse({ success: true });
});
