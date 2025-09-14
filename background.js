// Background script for Click & Scrape extension
// This script runs in the background and handles extension lifecycle events

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Click & Scrape extension installed');
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'elementClicked') {
    // Log the scraped data to the background console
    console.log('Element clicked:', request.data);
  }
  
  // Send response back if needed
  sendResponse({ success: true });
});
