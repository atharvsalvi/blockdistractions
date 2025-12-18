const toggle = document.getElementById('toggle');
const statusText = document.getElementById('status');

function updateStatus(isOn) {
    statusText.textContent = isOn ? 'Distractions Hidden' : 'Distractions Visible';
    statusText.style.color = isOn ? '#3ea6ff' : '#aaaaaa';
}

// Initialize state
chrome.storage.sync.get('ytBlocker', (data) => {
    const isOn = data.ytBlocker || false;
    toggle.checked = isOn;
    updateStatus(isOn);
});

// Handle toggle change
toggle.addEventListener('change', () => {
    const isOn = toggle.checked;
    chrome.storage.sync.set({ ytBlocker: isOn });
    updateStatus(isOn);
});
