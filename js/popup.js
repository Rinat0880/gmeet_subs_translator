const turnonoffButton = document.getElementById('turner');
if (turnonoffButton) {
    turnonoffButton.addEventListener('click', function(e) {
        e.preventDefault();
        chrome.runtime.sendMessage({ action: 'toggleExtension' }, function(response) {
            if (response.status === 'enabled') {
                turnonoffButton.textContent = 'Turn Off';
            } else {
                turnonoffButton.textContent = 'Turn On';
            }
        });
    })
}