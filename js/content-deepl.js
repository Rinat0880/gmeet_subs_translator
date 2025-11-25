(function() {
    'use strict';
    
    if (!window.location.hostname.includes('deepl.com')) return;
    
    console.log('[Meet Translator] DeepL script loaded');
    
    function findInputField() {
        const selectors = [
            'div[contenteditable="true"][role="textbox"][data-gramm="false"]',
            'd-textarea[data-testid="translator-source-input"] div[contenteditable="true"]',
            'section[dl-test="translator-source"] div[contenteditable="true"]',
            'div[aria-labelledby="translation-source-heading"] div[contenteditable="true"]',
            'div.lmt__inner_textarea_container div[contenteditable="true"]',
            'div[contenteditable="true"][role="textbox"]'
        ];
        
        for (const selector of selectors) {
            const el = document.querySelector(selector);
            if (el) {
                return el;
            }
        }
        return null;
    }
    
    function clearInput(input) {
        if (!input) return;
        
        input.focus();
        
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(input);
        selection.removeAllRanges();
        selection.addRange(range);
        
        document.execCommand('delete', false, null);
        
        input.innerHTML = '';
        input.textContent = '';
    }
    
    function insertText(text) {
        const input = findInputField();
        
        if (!input) {
            console.error('[Meet Translator] Input field not found');
            return false;
        }
        
        try {
            clearInput(input);
            
            setTimeout(() => {
                input.focus();
                
                // Вставляем через execCommand
                document.execCommand('insertText', false, text);
                
                if (!input.textContent || input.textContent.trim() === '') {
                    input.textContent = text;
                    input.dispatchEvent(new InputEvent('input', { 
                        bubbles: true,
                        cancelable: true,
                        inputType: 'insertText',
                        data: text
                    }));
                }
                
                const sel = window.getSelection();
                const range = document.createRange();
                range.selectNodeContents(input);
                range.collapse(false);
                sel.removeAllRanges();
                sel.addRange(range);
                
                console.log('[Meet Translator] Text inserted:', text.substring(0, 50));
            }, 50);
            
            return true;
            
        } catch (error) {
            console.error('[Meet Translator] Insert error:', error);
            return false;
        }
    }
    
    async function insertTextClipboard(text) {
        const input = findInputField();
        if (!input) return false;
        
        try {
            clearInput(input);
            input.focus();
            
            await navigator.clipboard.writeText(text);
            document.execCommand('paste');
            
            return true;
        } catch (e) {
            console.error('[Meet Translator] Clipboard method failed:', e);
            return false;
        }
    }
    
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('[Meet Translator] Message:', request.action);
        
        if (request.action === 'translateText') {
            // Пробуем основной метод
            let success = insertText(request.text);
            
            if (!success) {
                insertTextClipboard(request.text).then(clipSuccess => {
                    sendResponse({ success: clipSuccess });
                });
                return true;
            }
            
            sendResponse({ success: true });
            return true;
        }
        
        if (request.action === 'ping') {
            sendResponse({ pong: true, ready: !!findInputField() });
            return true;
        }
        
        return false;
    });
    
    function waitForInput() {
        let attempts = 0;
        const check = setInterval(() => {
            attempts++;
            const input = findInputField();
            if (input) {
                clearInterval(check);
                console.log('[Meet Translator] DeepL ready');
            }
            if (attempts > 60) clearInterval(check);
        }, 500);
    }
    
    waitForInput();
    
})();