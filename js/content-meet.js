(function() {
    'use strict';
    
    if (!window.location.hostname.includes('meet.google.com')) return;
    
    console.log('[Meet Translator] Meet script loaded');
    
    let isEnabled = false;
    let observer = null;
    let lastSubtitleText = '';
    let lastSentTime = 0;
    
    const MIN_SEND_INTERVAL = 500;
    const MIN_TEXT_LENGTH = 2;
    
    const GARBAGE_PATTERNS = [
        /arrow_downward/gi,
        /arrow_upward/gi,
        /Перейти вниз/gi,
        /Перейти вверх/gi,
        /Go down/gi,
        /Go up/gi
    ];
    
    // Имена участников которые нужно убирать (добавляйте сюда свои)
    const PARTICIPANT_NAMES = [
        /^Вы\s*/gi,      // "Вы " в начале строки
        /\s*Вы\s*/gi,    // "Вы" с пробелами
        /^You\s*/gi,     // "You " в начале
        /\s*You\s*/gi    // "You" с пробелами
    ];
    
    function cleanText(text) {
        if (!text) return '';
        
        let cleaned = text;
        
        // Удаляем мусор
        for (const pattern of GARBAGE_PATTERNS) {
            cleaned = cleaned.replace(pattern, '');
        }
        
        // Удаляем имена участников
        for (const pattern of PARTICIPANT_NAMES) {
            cleaned = cleaned.replace(pattern, ' ');
        }
        
        // Убираем лишние пробелы
        cleaned = cleaned.replace(/\s+/g, ' ').trim();
        
        // Удаляем дубликаты
        const words = cleaned.split(' ');
        if (words.length >= 4) {
            const half = Math.floor(words.length / 2);
            for (let len = half; len >= 2; len--) {
                const first = words.slice(0, len).join(' ');
                const second = words.slice(len, len * 2).join(' ');
                if (first === second) {
                    cleaned = (first + ' ' + words.slice(len * 2).join(' ')).trim();
                    break;
                }
            }
        }
        
        return cleaned;
    }
    
    function extractText(container) {
        if (!container) return '';
        
        const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
        const parts = [];
        let node;
        
        while (node = walker.nextNode()) {
            const text = node.textContent.trim();
            if (text) {
                const parent = node.parentElement;
                if (parent) {
                    const cls = parent.className || '';
                    if (cls.includes('zs7s8d') || cls.includes('KcIKyf')) continue;
                }
                
                // Пропускаем если это просто "Вы" или "You"
                if (text === 'Вы' || text === 'You') continue;
                
                parts.push(text);
            }
        }
        
        return cleanText(parts.join(' '));
    }
    
    function findSubtitleContainer() {
        const selectors = ['[jsname="tgaKEf"]', '.iOzk7', '.a4cQT', '[role="region"][aria-live="polite"]'];
        for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el && el.textContent.trim().length > 0) return el;
        }
        return null;
    }
    
    async function sendSubtitle(text) {
        if (!text || text.length < MIN_TEXT_LENGTH) return;
        
        const now = Date.now();
        if (text === lastSubtitleText || (now - lastSentTime) < MIN_SEND_INTERVAL) return;
        
        lastSubtitleText = text;
        lastSentTime = now;
        
        console.log('[Meet Translator] Sending:', text);
        
        try {
            await chrome.runtime.sendMessage({
                action: 'newSubtitle',
                text: text,
                timestamp: now
            });
        } catch (e) {
            console.error('[Meet Translator] Send error:', e);
        }
    }
    
    function processSubtitles() {
        if (!isEnabled) return;
        const container = findSubtitleContainer();
        if (container) {
            const text = extractText(container);
            if (text) sendSubtitle(text);
        }
    }
    
    function startObserver() {
        if (observer) observer.disconnect();
        
        observer = new MutationObserver(() => {
            if (isEnabled) processSubtitles();
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }
    
    let interval = null;
    
    function setEnabled(enabled) {
        isEnabled = enabled;
        
        if (enabled) {
            startObserver();
            if (interval) clearInterval(interval);
            interval = setInterval(processSubtitles, 1000);
        } else {
            if (observer) observer.disconnect();
            if (interval) clearInterval(interval);
            lastSubtitleText = '';
        }
        
        console.log('[Meet Translator]', enabled ? 'Enabled' : 'Disabled');
    }
    
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'setEnabled') {
            setEnabled(request.enabled);
            sendResponse({ success: true });
        } else if (request.action === 'ping') {
            sendResponse({ pong: true });
        }
        return true;
    });
    
    (async () => {
        try {
            const response = await chrome.runtime.sendMessage({ action: 'getStatus' });
            if (response && response.status === 'enabled') {
                setEnabled(true);
            }
        } catch (e) {}
    })();
    
})();