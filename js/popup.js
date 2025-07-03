let isEnabled = false;
let subtitlesInterval = null;

const toggleBtn = document.getElementById('toggleBtn');
const subtitlesContent = document.getElementById('subtitlesContent');
const statusIndicator = document.getElementById('statusIndicator');
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
        }
    } catch (error) {
        console.error('Error toggling extension:', error);
    }
});

window.addEventListener('beforeunload', () => {
    if (subtitlesInterval) {
        clearInterval(subtitlesInterval);
    }
});