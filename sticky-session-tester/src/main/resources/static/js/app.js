let autoRefreshInterval = null;
let autoRefreshEnabled = false;

function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return hash;
}

function setPodColor(podName) {
    const podIndex = Math.abs(hashCode(podName)) % 3;
    document.body.className = `pod-${podIndex}`;
}

function formatTimestamp(timestamp) {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
}

function updateUI(data) {
    document.getElementById('podName').textContent = data.podName;
    document.getElementById('podNameValue').textContent = data.podName;
    document.getElementById('podIp').textContent = data.podIp;
    document.getElementById('podNamespace').textContent = data.podNamespace;
    document.getElementById('containerName').textContent = data.containerName;
    document.getElementById('serviceName').textContent = data.serviceName;

    document.getElementById('sessionId').textContent = data.sessionId;
    document.getElementById('creationTime').textContent = formatTimestamp(data.creationTime);
    document.getElementById('lastAccessedTime').textContent = formatTimestamp(data.lastAccessedTime);
    document.getElementById('requestCount').textContent = data.requestCount;
    document.getElementById('stickyCookie').textContent = data.stickyCookiePresent ? '✓ Present' : '✗ Not Present';

    setPodColor(data.podName);
}

function fetchInfo() {
    fetch('api/info')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            updateUI(data);
        })
        .catch(error => {
            console.error('Error fetching info:', error);
            document.getElementById('podName').textContent = 'Error loading data';
        });
}

function toggleAutoRefresh() {
    const btn = document.getElementById('autoRefreshBtn');

    if (autoRefreshEnabled) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
        autoRefreshEnabled = false;
        btn.textContent = 'Enable Auto-Refresh';
        btn.classList.remove('active');
    } else {
        autoRefreshInterval = setInterval(fetchInfo, 2000);
        autoRefreshEnabled = true;
        btn.textContent = 'Disable Auto-Refresh';
        btn.classList.add('active');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    fetchInfo();

    document.getElementById('refreshBtn').addEventListener('click', fetchInfo);
    document.getElementById('autoRefreshBtn').addEventListener('click', toggleAutoRefresh);
});
