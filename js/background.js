console.log("Background script is alive!");

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
            timestamp: request.timestamp,
            translated: null
        };
        
        console.log('New subtitle received:', request.text);
        
        // translateSubtitle(request.text);
    }
    
    else if (request.action === 'getSubtitles') {
        sendResponse({
            subtitle: currentSubtitle, 
            isEnabled: isEnabled
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

async function translateSubtitle(text) {
    console.log('Translating:', text);
    
    // Пример структуры для будущего API запроса:
    /*
    try {
        const response = await fetch('https://api-free.deepl.com/v2/translate', {
            method: 'POST',
            headers: {
                'Authorization': 'DeepL-Auth-Key YOUR_API_KEY',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                'text': text,
                'target_lang': 'RU'
            })
        });
        
        const data = await response.json();
        return data.translations[0].text;
    } catch (error) {
        console.error('Translation error:', error);
        return text;
    }
    */
}

chrome.runtime.onStartup.addListener(() => {
    console.log('Extension started');
});

chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed');
    chrome.storage.local.set({extensionEnabled: false});
});