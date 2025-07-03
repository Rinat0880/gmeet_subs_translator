let isEnabled = false;
let subtitlesInterval = null;

const toggleBtn = document.getElementById('toggleBtn');
const subtitlesContent = document.getElementById('subtitlesContent');
const statusIndicator = document.getElementById('statusIndicator');
const refreshBtn = document.getElementById('refreshBtn');
const warningMessage = document.getElementById('warningMessage');

document.addEventListener('DOMContentLoaded', async () => {
    await checkExtensionStatus();
    await loadSubtitles();
    
    subtitlesInterval = setInterval(loadSubtitles, 1000);
});

async function checkExtensionStatus() {
    try {
        const response = await chrome.runtime.sendMessage({action: 'getStatus'});
        isEnabled = response.status === 'enabled';
        updateButtonState();
    } catch (error) {
        console.error('Error checking status:', error);
    }
}

function updateButtonState() {
    if (isEnabled) {
        toggleBtn.textContent = 'Turn Off';
        toggleBtn.className = 'toggle-btn enabled';
        statusIndicator.style.display = 'block';
        warningMessage.style.display = 'block';
    } else {
        toggleBtn.textContent = 'Turn On';
        toggleBtn.className = 'toggle-btn disabled';
        statusIndicator.style.display = 'none';
        warningMessage.style.display = 'none';
    }
}

async function loadSubtitles() {
    try {
        const response = await chrome.runtime.sendMessage({action: 'getSubtitles'});
        
        if (response && response.subtitles) {
            displaySubtitles(response.subtitles);
        }
    } catch (error) {
        console.error('Error loading subtitles:', error);
    }
}

// Отображаем субтитры
function displaySubtitles(subtitles) {
    if (!subtitles || subtitles.length === 0) {
        subtitlesContent.innerHTML = `
            <div class="no-subtitles">
                ${isEnabled ? 'Ожидание субтитров...' : 'Субтитры появятся здесь, когда вы включите расширение'}
            </div>
        `;
        return;
    }
    
    const subtitlesHtml = subtitles.map(subtitle => {
        return `
            <div class="subtitle-item">
                <div class="subtitle-original">
                    ${escapeHtml(subtitle.text)}
                </div>
                ${subtitle.translated ? `
                    <div class="subtitle-translated">
                        ${escapeHtml(subtitle.translated)}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
    
    subtitlesContent.innerHTML = subtitlesHtml;
    
    subtitlesContent.scrollTop = subtitlesContent.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

toggleBtn.addEventListener('click', async () => {
    try {
        const response = await chrome.runtime.sendMessage({action: 'toggleExtension'});
        
        if (response) {
            isEnabled = response.status === 'enabled';
            updateButtonState();
            
            await loadSubtitles();
            
            if (isEnabled) {
                showNotification('Расширение включено! Включите субтитры в Google Meet');
            } else {
                showNotification('Расширение выключено');
            }
        }
    } catch (error) {
        console.error('Error toggling extension:', error);
        showNotification('Ошибка при переключении расширения');
    }
});

refreshBtn.addEventListener('click', async () => {
    refreshBtn.textContent = '⟳';
    refreshBtn.style.animation = 'spin 1s linear infinite';
    
    await loadSubtitles();
    
    setTimeout(() => {
        refreshBtn.style.animation = 'none';
        refreshBtn.textContent = '⟳';
    }, 1000);
});

function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px 15px;
        border-radius: 5px;
        font-size: 12px;
        z-index: 1000;
        max-width: 200px;
        word-wrap: break-word;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        document.body.removeChild(notification);
    }, 3000);
}

window.addEventListener('beforeunload', () => {
    if (subtitlesInterval) {
        clearInterval(subtitlesInterval);
    }
});

const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

console.log('Popup script loaded');