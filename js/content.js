
let isExtensionEnabled = false;
let observer = null;
let lastSubtitleText = '';

chrome.storage.local.get(['extensionEnabled'], function(result) {
    isExtensionEnabled = result.extensionEnabled || false;
    if (isExtensionEnabled) {
        startWatchingSubtitles();
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggleExtension') {
        isExtensionEnabled = !isExtensionEnabled;
        chrome.storage.local.set({extensionEnabled: isExtensionEnabled});
        
        if (isExtensionEnabled) {
            startWatchingSubtitles();
        } else {
            stopWatchingSubtitles();
        }
        
        sendResponse({status: isExtensionEnabled ? 'enabled' : 'disabled'});
    }
    return true;
});

function startWatchingSubtitles() {
    if (observer) {
        observer.disconnect();
    }
    
    setTimeout(() => {
        findAndWatchSubtitles();
    }, 2000);
}

function stopWatchingSubtitles() {
    if (observer) {
        observer.disconnect();
        observer = null;
    }
}

function findAndWatchSubtitles() {
    // Основные селекторы для субтитров Google Meet
    const subtitleSelectors = [
        '[jsname="dsyhDe"]',
        '[aria-live="polite"]'
    ];
    
    let subtitleContainer = null;
    
    for (const selector of subtitleSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim()) {
            subtitleContainer = element;
            break;
        }
    }
    
    if (subtitleContainer) {
        watchSubtitleContainer(subtitleContainer);
    } else {
        setTimeout(findAndWatchSubtitles, 3000);
    }
}

function watchSubtitleContainer(container) {
    observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' || mutation.type === 'characterData') {
                const currentText = container.textContent.trim();
                
                if (currentText && currentText !== lastSubtitleText && currentText.length > 2) {
                    lastSubtitleText = currentText;
                    
                    chrome.runtime.sendMessage({
                        action: 'newSubtitle',
                        text: currentText,
                        timestamp: Date.now()
                    });
                }
            }
        });
    });
    
    observer.observe(container, {
        childList: true,
        subtree: true,
        characterData: true
    });
}

document.addEventListener('click', (event) => {
    if (isExtensionEnabled) {
        const buttonText = event.target.textContent.toLowerCase();
        if (buttonText.includes('caption') || buttonText.includes('subtitle')) {
            setTimeout(findAndWatchSubtitles, 2000);
        }
    }
});