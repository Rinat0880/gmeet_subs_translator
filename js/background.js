let currentSubtitle = null; 
let isEnabled = false;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggleExtension') {
        isEnabled = !isEnabled;
        chrome.storage.local.set({extensionEnabled: isEnabled});
        
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {action: 'toggleExtension'});
            }
        });
        
        sendResponse({status: isEnabled ? 'enabled' : 'disabled'});
    }
    
    else if (request.action === 'newSubtitle') {
        currentSubtitle = {
            text: request.text,
            timestamp: request.timestamp
        };
    }
    
    else if (request.action === 'getSubtitles') {
        sendResponse({
            subtitles: currentSubtitle ? [currentSubtitle] : []
        });
    }
    
    else if (request.action === 'getStatus') {
        chrome.storage.local.get(['extensionEnabled'], (result) => {
            sendResponse({
                status: result.extensionEnabled ? 'enabled' : 'disabled'
            });
        });
    }
    
    return true;
});

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({extensionEnabled: false});
});