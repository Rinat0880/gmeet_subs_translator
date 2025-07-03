const OnClickHello = async (e) => {
    let queryOptions = {actions: true, lastFocusedWindow: true};
    const {tab} = await chrome.tabs.query(queryOptions);
    chrome.tabs.remove(tab.id)
}

const btn = document.getElementById('hello');
if (btn) {
    btn.addEventListener('click', OnClickHello);
}