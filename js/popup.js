(function() {
    'use strict';
    
    let toggleBtn, subtitlesContent, statusIndicator;
    let isEnabled = false;
    let isMeetTab = false;
    let refreshInterval = null;
    
    function initElements() {
        toggleBtn = document.getElementById('toggleBtn');
        subtitlesContent = document.getElementById('subtitlesContent');
        statusIndicator = document.getElementById('statusIndicator');
        return toggleBtn && subtitlesContent && statusIndicator;
    }
    
    async function getStatus() {
        try {
            const response = await chrome.runtime.sendMessage({ action: 'getStatus' });
            if (response) {
                isEnabled = response.status === 'enabled';
                isMeetTab = response.isMeetTab || false;
            }
        } catch (e) {
            console.error('Error:', e);
        }
    }
    
    function updateUI() {
        toggleBtn.classList.remove('enabled', 'disabled', 'inactive');
        
        if (!isMeetTab) {
            toggleBtn.textContent = 'Откройте Google Meet';
            toggleBtn.classList.add('inactive');
            toggleBtn.disabled = true;
            statusIndicator.classList.remove('on');
        } else if (isEnabled) {
            toggleBtn.textContent = 'Выключить';
            toggleBtn.classList.add('enabled');
            toggleBtn.disabled = false;
            statusIndicator.classList.add('on');
        } else {
            toggleBtn.textContent = 'Включить';
            toggleBtn.classList.add('disabled');
            toggleBtn.disabled = false;
            statusIndicator.classList.remove('on');
        }
    }
    
    async function loadSubtitles() {
        try {
            const response = await chrome.runtime.sendMessage({ action: 'getSubtitles' });
            displaySubtitles(response?.subtitles || []);
        } catch (e) {
            console.error('Error:', e);
        }
    }
    
    function displaySubtitles(subtitles) {
        if (!subtitles || subtitles.length === 0) {
            let msg;
            if (!isMeetTab) {
                msg = 'Откройте Google Meet';
            } else if (!isEnabled) {
                msg = 'Нажмите "Включить" для начала';
            } else {
                msg = 'Ожидание субтитров...';
            }
            subtitlesContent.innerHTML = `<div class="no-subtitles">${msg}</div>`;
            return;
        }
        
        const html = subtitles.map(s => {
            const time = new Date(s.timestamp).toLocaleTimeString();
            return `<div class="subtitle-item">
                <div class="subtitle-time">${time}</div>
                <div class="subtitle-text">${escapeHtml(s.text)}</div>
            </div>`;
        }).join('');
        
        subtitlesContent.innerHTML = html;
    }
    
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    async function toggle() {
        if (!isMeetTab) return;
        
        toggleBtn.disabled = true;
        toggleBtn.textContent = '...';
        
        try {
            const response = await chrome.runtime.sendMessage({ action: 'toggleExtension' });
            if (response && response.status !== 'error') {
                isEnabled = response.status === 'enabled';
            }
        } catch (e) {
            console.error('Error:', e);
        }
        
        updateUI();
        await loadSubtitles();
    }
    
    async function init() {
        if (!initElements()) return;
        
        await getStatus();
        updateUI();
        await loadSubtitles();
        
        toggleBtn.addEventListener('click', toggle);
        refreshInterval = setInterval(loadSubtitles, 2000);
    }
    
    document.addEventListener('DOMContentLoaded', init);
    window.addEventListener('beforeunload', () => {
        if (refreshInterval) clearInterval(refreshInterval);
    });
    
})();