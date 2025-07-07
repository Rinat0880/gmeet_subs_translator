let currentSubtitle = null; 
let isEnabled = false;

async function sendToDeepL(text) {
    try {
        const tabs = await chrome.tabs.query({});
        const deepLTab = tabs.find(tab => tab.url && tab.url.includes('deepl.com'));
        
        if (deepLTab) {
            await chrome.tabs.sendMessage(deepLTab.id, {
                action: 'translateText',
                text: text
            });
        } else {
            const newTab = await chrome.tabs.create({
                url: 'https://www.deepl.com/translator'
            });
            
            setTimeout(async () => {
                try {
                    await chrome.tabs.sendMessage(newTab.id, {
                        action: 'translateText',
                        text: text
                    });
                } catch (error) {
                    console.error('Error sending to DeepL:', error);
                }
            }, 3000);
        }
    } catch (error) {
        console.error('Error in sendToDeepL:', error);
    }
}

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
        
        if (isEnabled) {
            sendToDeepL(request.text);
        }
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