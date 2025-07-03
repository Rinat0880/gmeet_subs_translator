
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
    console.log('Content script received message:', request.action);
    
    if (request.action === 'toggleExtension') {
        isExtensionEnabled = !isExtensionEnabled;
        chrome.storage.local.set({extensionEnabled: isExtensionEnabled});
        
        if (isExtensionEnabled) {
            console.log('Starting subtitle watching...');
            startWatchingSubtitles();
        } else {
            console.log('Stopping subtitle watching...');
            stopWatchingSubtitles();
        }
        
        sendResponse({status: isExtensionEnabled ? 'enabled' : 'disabled'});
    }
    return true;
});

function startWatchingSubtitles() {
    console.log('Starting subtitle watching...');
    
    if (observer) {
        observer.disconnect();
    }
    
    setTimeout(() => {
        findAndWatchSubtitles();
    }, 2000);
}

function stopWatchingSubtitles() {
    console.log('Stopping subtitle watching...');
    if (observer) {
        observer.disconnect();
        observer = null;
    }
}

function findAndWatchSubtitles() {
    const subtitleSelectors = [
        // '[data-is-captions="true"]',
        '[jsname="dsyhDe"]',
        // '.a4cQT',
        // '.TBMuR',
        // '[data-caption-track-id]',
        // '.captions-text',
        // '[aria-live="polite"]'
    ];
    
    let subtitleContainer = null;
    
    for (const selector of subtitleSelectors) {
        const element = document.querySelector(selector);
        if (element) {
            subtitleContainer = element;
            console.log('Found subtitle container:', selector);
            break;
        }
    }
    
    // if (!subtitleContainer) {
    //     const ariaLiveElements = document.querySelectorAll('[aria-live="polite"]');
    //     for (const element of ariaLiveElements) {
    //         if (element.textContent.trim()) {
    //             subtitleContainer = element;
    //             console.log('Found subtitle container by aria-live');
    //             break;
    //         }
    //     }
    // }
    
    // if (!subtitleContainer) {
    //     const possibleParents = document.querySelectorAll('div[jsname]');
    //     for (const parent of possibleParents) {
    //         const textElements = parent.querySelectorAll('div, span, p');
    //         for (const textEl of textElements) {
    //             if (textEl.textContent.trim().length > 10) {
    //                 subtitleContainer = parent;
    //                 console.log('Found subtitle container by parent');
    //                 break;
    //             }
    //         }
    //         if (subtitleContainer) break;
    //     }
    // }
    
    if (subtitleContainer) {
        watchSubtitleContainer(subtitleContainer);
    } else {
        console.log('Subtitle container not found, retrying in 3 seconds...');
        setTimeout(findAndWatchSubtitles, 3000);
    }
}

function watchSubtitleContainer(container) {
    console.log('Watching subtitle container:', container);
    
    observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' || mutation.type === 'characterData') {
                const currentText = container.textContent.trim();
                
                if (currentText && currentText !== lastSubtitleText && currentText.length > 2) {
                    lastSubtitleText = currentText;
                    console.log('New subtitle:', currentText);
                    
                    chrome.runtime.sendMessage({
                        action: 'newSubtitle',
                        text: currentText,
                        timestamp: Date.now()
                    });
                }
            }
        });
    });
    
    const observerOptions = {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: false
    };
    
    observer.observe(container, observerOptions);
    
    const parentObserver = new MutationObserver(() => {
        if (!document.contains(container)) {
            console.log('Subtitle container disappeared, searching for new one...');
            setTimeout(findAndWatchSubtitles, 1000);
        }
    });
    
    parentObserver.observe(document.body, {
        childList: true,
        subtree: true
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

console.log('Meet Subtitles Translator content script loaded');