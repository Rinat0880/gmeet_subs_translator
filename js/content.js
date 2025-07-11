let isExtensionEnabled = false;
let observer = null;
let lastSubtitleText = '';

const isMeetPage = window.location.hostname === 'meet.google.com';
const isDeepLPage = window.location.hostname === 'www.deepl.com';

if (isMeetPage) {
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
        
        // Новый обработчик для проверки доступности субтитров
        else if (request.action === 'checkSubtitles') {
            const subtitleSelectors = [
                '[class="ygicle VbkSUe"]',
                '[aria-live="polite"]'
            ];
            
            let subtitlesFound = false;
            
            for (const selector of subtitleSelectors) {
                const element = document.querySelector(selector);
                if (element) {
                    subtitlesFound = true;
                    break;
                }
            }
            
            sendResponse({available: subtitlesFound});
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
        const subtitleSelectors = [
            '[class="ygicle VbkSUe"]',
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
}

if (isDeepLPage) {
    function findDeepLInput() {
        const selectors = [
            'div[contenteditable="true"][role="textbox"][aria-placeholder*="Введите текст"]',
            'div[contenteditable="true"][data-content="true"]',
            'div[aria-labelledby="translation-source-heading"]',
            'div[contenteditable="true"][role="textbox"]'
        ];
        
        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
                return element;
            }
        }
        
        return null;
    }

    function insertTextToDeepL(text) {
        const inputField = findDeepLInput();
        
        if (!inputField) {
            console.error('DeepL input field not found');
            return false;
        }
        
        try {
            inputField.innerHTML = '';
            
            const p = document.createElement('p');
            const span = document.createElement('span');
            span.className = '--l --r container-source';
            span.textContent = text;
            p.appendChild(span);
            
            inputField.appendChild(p);
            
            const inputEvent = new Event('input', { bubbles: true });
            const changeEvent = new Event('change', { bubbles: true });
            
            inputField.dispatchEvent(inputEvent);
            inputField.dispatchEvent(changeEvent);
            
            inputField.focus();
            
            return true;
        } catch (error) {
            console.error('Error inserting text:', error);
            return false;
        }
    }

    function insertTextAlternative(text) {
        const inputField = findDeepLInput();
        
        if (!inputField) {
            return false;
        }
        
        try {
            inputField.focus();
            
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(inputField);
            selection.removeAllRanges();
            selection.addRange(range);
            
            document.execCommand('insertText', false, text);
            
            return true;
        } catch (error) {
            console.error('Alternative method failed:', error);
            return false;
        }
    }

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'translateText') {
            const success = insertTextToDeepL(request.text) || insertTextAlternative(request.text);
            sendResponse({ success });
        }
    });

    function waitForDeepLToLoad() {
        return new Promise((resolve) => {
            const checkElement = () => {
                if (findDeepLInput()) {
                    resolve(true);
                } else {
                    setTimeout(checkElement, 500);
                }
            };
            checkElement();
        });
    }

    (async () => {
        console.log('DeepL Content Script loaded');
        
        await waitForDeepLToLoad();
        console.log('DeepL input field found and ready');
    })();
}