const STATE_KEY = 'extensionState';

const defaultState = {
    isEnabled: false,
    currentSubtitle: null,
    deepLTabId: null
};

async function getState() {
    try {
        const result = await chrome.storage.local.get(STATE_KEY);
        return result[STATE_KEY] || { ...defaultState };
    } catch (error) {
        return { ...defaultState };
    }
}

async function setState(newState) {
    const currentState = await getState();
    const updatedState = { ...currentState, ...newState };
    await chrome.storage.local.set({ [STATE_KEY]: updatedState });
    return updatedState;
}

function isMeetTab(tab) {
    return tab && tab.url && tab.url.includes('meet.google.com');
}

async function openDeepLTab() {
    const state = await getState();
    
    if (state.deepLTabId) {
        try {
            const tab = await chrome.tabs.get(state.deepLTabId);
            if (tab && tab.url && tab.url.includes('deepl.com')) {
                return state.deepLTabId;
            }
        } catch (e) {
            // Вкладка не существует
        }
    }
    
    const tabs = await chrome.tabs.query({});
    const existingTab = tabs.find(t => t.url && t.url.includes('deepl.com/translator'));
    
    if (existingTab) {
        await setState({ deepLTabId: existingTab.id });
        return existingTab.id;
    }
    
    const newTab = await chrome.tabs.create({
        url: 'https://www.deepl.com/translator',
        active: true
    });
    
    await setState({ deepLTabId: newTab.id });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    return newTab.id;
}

async function sendToDeepL(text) {
    if (!text || text.trim().length === 0) return false;
    
    const state = await getState();
    
    if (!state.deepLTabId) {
        console.log('No DeepL tab');
        return false;
    }
    
    try {
        await chrome.tabs.get(state.deepLTabId);
        
        await chrome.tabs.sendMessage(state.deepLTabId, {
            action: 'translateText',
            text: text.trim()
        });
        
        return true;
    } catch (error) {
        console.error('Error sending to DeepL:', error);
        await setState({ deepLTabId: null });
        return false;
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    (async () => {
        try {
            switch (request.action) {
                case 'toggleExtension': {
                    const state = await getState();
                    const newEnabled = !state.isEnabled;
                    
                    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
                    
                    if (newEnabled && !isMeetTab(activeTab)) {
                        sendResponse({ status: 'error', error: 'NOT_MEET_TAB' });
                        return;
                    }
                    
                    if (newEnabled) {
                        const deepLTabId = await openDeepLTab();
                        await setState({ isEnabled: true, deepLTabId: deepLTabId });
                        
                        if (activeTab) {
                            setTimeout(() => {
                                chrome.tabs.update(activeTab.id, { active: true });
                            }, 1000);
                        }
                    } else {
                        await setState({ isEnabled: false });
                    }
                    
                    if (activeTab && isMeetTab(activeTab)) {
                        try {
                            await chrome.tabs.sendMessage(activeTab.id, { 
                                action: 'setEnabled',
                                enabled: newEnabled
                            });
                        } catch (e) {}
                    }
                    
                    sendResponse({ status: newEnabled ? 'enabled' : 'disabled' });
                    break;
                }
                
                case 'getStatus': {
                    const state = await getState();
                    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
                    
                    sendResponse({
                        status: state.isEnabled ? 'enabled' : 'disabled',
                        isMeetTab: isMeetTab(activeTab),
                        currentSubtitle: state.currentSubtitle
                    });
                    break;
                }
                
                case 'newSubtitle': {
                    const state = await getState();
                    
                    const subtitle = {
                        text: request.text,
                        timestamp: request.timestamp || Date.now()
                    };
                    
                    await setState({ currentSubtitle: subtitle });
                    
                    if (state.isEnabled && state.deepLTabId) {
                        sendToDeepL(request.text);
                    }
                    
                    sendResponse({ success: true });
                    break;
                }
                
                case 'getSubtitles': {
                    const state = await getState();
                    sendResponse({
                        subtitles: state.currentSubtitle ? [state.currentSubtitle] : []
                    });
                    break;
                }
                
                default:
                    sendResponse({ error: 'Unknown action' });
            }
        } catch (error) {
            console.error('Error:', error);
            sendResponse({ error: error.message });
        }
    })();
    
    return true;
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
    const state = await getState();
    if (tabId === state.deepLTabId) {
        await setState({ deepLTabId: null, isEnabled: false });
    }
});

chrome.runtime.onInstalled.addListener(async () => {
    await chrome.storage.local.set({ [STATE_KEY]: defaultState });
});

chrome.runtime.onStartup.addListener(async () => {
    await chrome.storage.local.set({ [STATE_KEY]: defaultState });
});