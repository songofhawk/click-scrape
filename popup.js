document.getElementById('startSelection').addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Check if extension context is still valid
      if (!chrome.runtime || !chrome.runtime.id) {
        document.getElementById('status').textContent = 'Extension context invalidated. Please reload the extension.';
        return;
      }
    
      // Inject content.js script into the active tab
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      
      // Send message to start selection
      await chrome.tabs.sendMessage(tab.id, { action: 'startSelection' });
    
      document.getElementById('status').innerHTML = `
        <div style="color: #0078d4; font-weight: bold;">🎯 Element Selection Active</div>
        <div style="margin-top: 5px; font-size: 12px;">
          • Hover over elements to highlight them<br>
          • Click to select an element<br>
          • Press ESC to cancel
        </div>
      `;
    } catch (error) {
      console.error('Error starting selection:', error);
      document.getElementById('status').textContent = 'Error: ' + error.message;
    }
  });
  
  // Listen for messages from content.js
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    try {
      if (request.action === 'elementClicked') {
        const statusDiv = document.getElementById('status');
        const data = request.data;
        
        // Display the scraped data in the popup
        statusDiv.innerHTML = `
          <div style="color: #28a745; font-weight: bold; margin-bottom: 10px;">✅ Element Selected Successfully!</div>
          
          <div style="margin-bottom: 8px;">
            <strong>Tag:</strong> <code>${data.tagName}</code>
          </div>
          
          <div style="margin-bottom: 8px;">
            <strong>Text Content:</strong>
            <div style="background: #f8f9fa; padding: 5px; border-radius: 3px; margin-top: 2px; max-height: 60px; overflow-y: auto; font-size: 11px;">
              ${data.text || '(empty)'}
            </div>
          </div>
          
          <div style="margin-bottom: 8px;">
            <strong>CSS Selector:</strong>
            <div style="background: #f8f9fa; padding: 5px; border-radius: 3px; margin-top: 2px; font-size: 11px; word-break: break-all;">
              ${data.selector}
            </div>
          </div>
          
          ${data.attributes ? `
          <div style="margin-bottom: 8px;">
            <strong>Attributes:</strong>
            <div style="background: #f8f9fa; padding: 5px; border-radius: 3px; margin-top: 2px; font-size: 11px; word-break: break-all;">
              ${data.attributes}
            </div>
          </div>
          ` : ''}
          
          <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #dee2e6; font-size: 11px; color: #6c757d;">
            Click "Start Selection" to select another element
          </div>
        `;
    
        // Also log the data to the console for convenience
        console.log('--- Scraped Data from Clicked Element ---');
        console.log('Tag Name:', data.tagName);
        console.log('Element Text:', data.text);
        console.log('Generated Selector:', data.selector);
        console.log('Attributes:', data.attributes);
        console.log('-----------------------------------------');
      }
      
      // Send response back to content script
      sendResponse({ success: true });
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  });
  