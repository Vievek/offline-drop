// Parse query token from URL
const urlParams = new URLSearchParams(window.location.search);
let currentToken = urlParams.get('token') || localStorage.getItem('drop_token');

const statusPill = document.getElementById('statusPill');
const statusDot = statusPill.querySelector('.status-dot');
const statusText = document.getElementById('statusText');
const authSection = document.getElementById('authSection');
const mainApp = document.getElementById('mainApp');
const pinInput = document.getElementById('pinInput');
const authBtn = document.getElementById('authBtn');
const authError = document.getElementById('authError');

const sessionTotalData = document.getElementById('sessionTotalData');
const transferLogsList = document.getElementById('transferLogsList');
const clearLogsBtn = document.getElementById('clearLogsBtn');

const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const sharedFilesList = document.getElementById('sharedFilesList');
const refreshManifestBtn = document.getElementById('refreshManifestBtn');

if (refreshManifestBtn) {
  refreshManifestBtn.addEventListener('click', () => {
    loadManifest();
  });
}

const uploadProgressContainer = document.getElementById('uploadProgressContainer');
const uploadProgressBar = document.getElementById('uploadProgressBar');
const uploadFileName = document.getElementById('uploadFileName');
const uploadSpeed = document.getElementById('uploadSpeed');
const uploadStats = document.getElementById('uploadStats');
const uploadPercent = document.getElementById('uploadPercent');
const uploadResult = document.getElementById('uploadResult');

let socket = null;
let totalBytesTransferredSession = parseInt(localStorage.getItem('drop_total_bytes') || '0', 10);
let logsHistory = JSON.parse(localStorage.getItem('drop_transfer_logs') || '[]');

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function updateSessionStatsUI() {
  if (sessionTotalData) {
    sessionTotalData.textContent = formatBytes(totalBytesTransferredSession);
  }
}

function renderLogsUI() {
  if (!transferLogsList) return;
  if (logsHistory.length === 0) {
    transferLogsList.innerHTML = '<div class="log-empty">No transfers recorded in this session yet.</div>';
    return;
  }

  transferLogsList.innerHTML = logsHistory
    .slice(0, 20)
    .map((log) => {
      const isUp = log.direction === 'upload';
      const icon = isUp ? '📤' : '📥';
      return `
        <div class="log-entry">
          <div class="log-entry-left">
            <span class="log-icon">${icon}</span>
            <span class="log-name" title="${log.name}">${log.name}</span>
          </div>
          <div class="log-entry-right">
            <span>${formatBytes(log.bytes)}</span>
            <span class="log-time-tag">${log.durationSec}s (${log.avgSpeed || '0'} MB/s)</span>
          </div>
        </div>
      `;
    })
    .join('');
}

function addTransferLog(direction, name, bytes, durationMs) {
  const durationSec = Math.max(0.1, parseFloat((durationMs / 1000).toFixed(1)));
  const avgSpeed = parseFloat(((bytes * 8) / (durationSec * 1024 * 1024)).toFixed(2));

  totalBytesTransferredSession += bytes;
  localStorage.setItem('drop_total_bytes', totalBytesTransferredSession.toString());

  logsHistory.unshift({
    direction,
    name,
    bytes,
    durationSec,
    avgSpeed,
    timestamp: Date.now(),
  });

  if (logsHistory.length > 50) logsHistory.pop();
  localStorage.setItem('drop_transfer_logs', JSON.stringify(logsHistory));

  updateSessionStatsUI();
  renderLogsUI();
}

if (clearLogsBtn) {
  clearLogsBtn.addEventListener('click', () => {
    logsHistory = [];
    totalBytesTransferredSession = 0;
    localStorage.removeItem('drop_transfer_logs');
    localStorage.setItem('drop_total_bytes', '0');
    updateSessionStatsUI();
    renderLogsUI();
  });
}

// Check and authenticate session
async function verifySession() {
  updateSessionStatsUI();
  renderLogsUI();

  if (currentToken) {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: currentToken }),
      });
      const data = await res.json();
      if (data.ok) {
        localStorage.setItem('drop_token', currentToken);
        showMainApp();
        initWebSocket();
        loadManifest();
        return;
      }
    } catch (e) {
      console.warn('Auth check failed:', e);
    }
  }

  // Show PIN prompt
  authSection.classList.remove('hidden');
  mainApp.classList.add('hidden');
  statusText.textContent = 'Auth required';
}

authBtn.addEventListener('click', async () => {
  const pin = pinInput.value.trim();
  if (!pin) return;

  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    const data = await res.json();
    if (data.ok && data.token) {
      currentToken = data.token;
      localStorage.setItem('drop_token', currentToken);
      authError.textContent = '';
      showMainApp();
      initWebSocket();
      loadManifest();
    } else {
      authError.textContent = 'Incorrect PIN. Check your laptop screen.';
    }
  } catch (err) {
    authError.textContent = 'Connection error. Check Wi-Fi / Hotspot.';
  }
});

function showMainApp() {
  authSection.classList.add('hidden');
  mainApp.classList.remove('hidden');
  statusDot.classList.add('online');
  statusText.textContent = 'Connected (Direct LAN)';
}

// Load laptop files list
async function loadManifest() {
  try {
    const res = await fetch('/api/manifest');
    const data = await res.json();

    if (!data.items || data.items.length === 0) {
      sharedFilesList.innerHTML = `
        <div class="empty-state">
          <span>📭</span>
          <p>No files currently shared by laptop.</p>
          <small>Press <strong>[f]</strong> on your laptop terminal to select files anytime.</small>
        </div>
      `;
      return;
    }

    sharedFilesList.innerHTML = data.items
      .map((item) => {
        const isDir = item.isDirectory;
        const icon = isDir ? '📁' : '📄';
        const sizeInfo = isDir
          ? `${item.itemCount || 0} items (Download as ZIP)`
          : formatBytes(item.size);
        const downloadUrl = `/download/${item.id}?token=${encodeURIComponent(currentToken)}`;

        return `
        <div class="file-item">
          <div class="file-item-left">
            <span style="font-size: 22px;">${icon}</span>
            <div class="file-item-meta">
              <span class="file-name" title="${item.name}">${item.name}</span>
              <span class="file-size">${sizeInfo}</span>
            </div>
          </div>
          <button onclick="handleDownload('${item.name}', '${downloadUrl}', ${item.size})" class="btn btn-primary">
            Download ⬇
          </button>
        </div>
      `;
      })
      .join('');
  } catch (e) {
    console.error('Error fetching manifest:', e);
  }
}

// Trigger download and track transfer time & data logs
window.handleDownload = async function(name, url, expectedSize) {
  const startTime = Date.now();
  uploadProgressContainer.classList.remove('hidden');
  uploadProgressBar.style.width = '10%';
  uploadFileName.textContent = `Downloading ${name}...`;
  uploadSpeed.textContent = 'Starting...';

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Download request failed');

    const contentLength = +(response.headers.get('Content-Length') || expectedSize || 0);
    const reader = response.body.getReader();
    let receivedBytes = 0;
    const chunks = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      receivedBytes += value.length;

      if (contentLength > 0) {
        const pct = Math.min(100, Math.round((receivedBytes / contentLength) * 100));
        uploadProgressBar.style.width = `${pct}%`;
        uploadPercent.textContent = `${pct}%`;
        uploadStats.textContent = `${formatBytes(receivedBytes)} / ${formatBytes(contentLength)}`;
      }
    }

    const duration = Date.now() - startTime;
    const blob = new Blob(chunks);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    addTransferLog('download', name, receivedBytes, duration);

    uploadResult.textContent = `✔ Downloaded ${name} in ${(duration / 1000).toFixed(1)}s!`;
    uploadResult.classList.remove('hidden');
    setTimeout(() => {
      uploadProgressContainer.classList.add('hidden');
      uploadProgressBar.style.width = '0%';
    }, 1500);
  } catch (err) {
    console.error(err);
    // Fallback direct link
    window.location.href = url;
  }
};

// WebSocket telemetry for real-time progress & live updates
function initWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws`;

  socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    statusDot.classList.add('online');
    statusText.textContent = 'Connected (Direct LAN)';
    loadManifest(); // Always sync manifest when WS connects
  };

  socket.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);

      // Instant refresh if user pressed [f] on laptop and selected new files
      if (msg.type === 'files_updated') {
        loadManifest();
      }

      if (msg.type === 'upload_progress' || msg.type === 'download_progress') {
        uploadProgressContainer.classList.remove('hidden');
        uploadProgressBar.style.width = `${msg.percent}%`;
        uploadFileName.textContent = msg.fileName || 'Transferring...';
        uploadSpeed.textContent = `${msg.speedMbps || 0} MB/s`;
        uploadPercent.textContent = `${msg.percent}%`;
        if (msg.totalBytes) {
          uploadStats.textContent = `${formatBytes(msg.bytesTransferred)} / ${formatBytes(msg.totalBytes)}`;
        }
      }

      if (msg.type === 'transfer_complete') {
        setTimeout(() => {
          uploadProgressContainer.classList.add('hidden');
          uploadProgressBar.style.width = '0%';
        }, 1500);
      }
    } catch (e) {
      console.warn('WS message error', e);
    }
  };

  socket.onclose = () => {
    statusDot.classList.remove('online');
    statusText.textContent = 'Disconnected';
    setTimeout(initWebSocket, 2000);
  };
}

// Upload handling with streaming progress & transfer time log
async function handleFilesUpload(files) {
  if (!files || files.length === 0) return;

  const formData = new FormData();
  let totalBytes = 0;
  for (const file of files) {
    formData.append('files', file, file.name);
    totalBytes += file.size;
  }

  uploadResult.classList.add('hidden');
  uploadProgressContainer.classList.remove('hidden');
  const summaryName = files.length === 1 ? files[0].name : `${files.length} files`;
  uploadFileName.textContent = summaryName;
  uploadProgressBar.style.width = '0%';

  const xhr = new XMLHttpRequest();
  const startTime = Date.now();

  xhr.upload.onprogress = (e) => {
    if (e.lengthComputable) {
      const percent = Math.round((e.loaded / e.total) * 100);
      uploadProgressBar.style.width = `${percent}%`;
      uploadPercent.textContent = `${percent}%`;
      uploadStats.textContent = `${formatBytes(e.loaded)} / ${formatBytes(e.total)}`;

      const now = Date.now();
      const elapsedSeconds = (now - startTime) / 1000;
      if (elapsedSeconds > 0) {
        const speed = (e.loaded / elapsedSeconds / (1024 * 1024)).toFixed(1);
        uploadSpeed.textContent = `${speed} MB/s`;
      }
    }
  };

  xhr.onload = () => {
    const durationMs = Date.now() - startTime;
    if (xhr.status >= 200 && xhr.status < 300) {
      const resp = JSON.parse(xhr.responseText);
      addTransferLog('upload', summaryName, totalBytes, durationMs);

      uploadResult.textContent = `✔ Uploaded in ${(durationMs / 1000).toFixed(1)}s! Saved to Laptop.`;
      uploadResult.classList.remove('hidden');
      setTimeout(() => uploadProgressContainer.classList.add('hidden'), 1500);
    } else {
      uploadResult.textContent = `❌ Upload failed: ${xhr.statusText}`;
      uploadResult.classList.remove('hidden');
    }
  };

  xhr.onerror = () => {
    uploadResult.textContent = '❌ Connection lost. Check Wi-Fi / Hotspot.';
    uploadResult.classList.remove('hidden');
  };

  xhr.open('POST', `/upload?token=${encodeURIComponent(currentToken)}`);
  xhr.send(formData);
}

fileInput.addEventListener('change', (e) => {
  if (e.target.files && e.target.files.length > 0) {
    handleFilesUpload(e.target.files);
  }
});

// Drag & drop support
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.style.borderColor = 'var(--primary)';
});
dropZone.addEventListener('dragleave', () => {
  dropZone.style.borderColor = 'rgba(56, 189, 248, 0.4)';
});
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.style.borderColor = 'rgba(56, 189, 248, 0.4)';
  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    handleFilesUpload(e.dataTransfer.files);
  }
});

verifySession();
