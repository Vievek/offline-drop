# Offline QR Drop ⚡

Direct offline file sharing between laptop and phone (such as Samsung Galaxy S25 FE) over **existing Wi-Fi networks** or **mobile hotspots**. No internet access, cloud servers, or third-party apps required.

---

## 🌟 Key Features
- **Automatic Adapter Discovery**: Intelligently identifies and ranks active Wi-Fi and Mobile Hotspot interfaces while filtering out loopbacks, APIPA (`169.254.x.x`), and virtual bridges (`WSL/Hyper-V/Docker`).
- **Simultaneous All-Interface Binding (`0.0.0.0`)**: The server listens across all interfaces. Switching between home Wi-Fi and phone hotspot is seamless.
- **Bi-Directional Streaming Transfer**:
  - **Laptop ➔ Phone**: Zero-RAM streaming file downloads with HTTP Range support (pause/resume) and on-the-fly zip packaging for directories.
  - **Phone ➔ Laptop**: High-speed chunked multipart upload via `busboy` straight into `./storage`.
- **Zero-Install Phone UI**: Modern, responsive dark-mode mobile web application with live speed telemetry, progress bars, and drag-and-drop file/photo picking.
- **Security & Authorization**: Ephemeral QR tokens and PIN fallback verification.

---

## 🚀 Quick Start

### 1. Build & Run
From your PowerShell terminal in the project directory:

```powershell
# Run the application
npm start
```

### Configure Custom Upload Destination
You can choose any destination folder on your laptop for files uploaded from your phone.

Create or edit `.env`:
```ini
DROP_STORAGE_PATH=D:\MyTransferredFiles
# or a folder like C:\Users\<YourUsername>\Desktop\PhoneDrops
```
If not specified, it will save into `./storage` by default.

Or run with specific files or folders you want to share with your phone:

```powershell
npx tsx src/index.ts "C:\path\to\document.pdf" "C:\path\to\PhotosFolder"
```

### 2. Connect Your Phone
1. Connect both devices to the same **Wi-Fi router**, OR enable your **phone hotspot** (e.g. Samsung S25 FE) and connect your laptop to it.
2. Point your phone camera at the QR code displayed in your terminal.
3. Tap the link to open the transfer portal.
4. **Send to Laptop**: Tap the upload zone to send photos, videos, or documents directly to your laptop's `./storage` folder.
5. **Download to Phone**: Tap `Download ⬇` next to any shared file or folder.

---

## ⌨ Terminal Controls & Keybindings
- **`[f]`**: Open native **Windows File Picker dialog** anytime while the server is running to select multiple files/documents. Once selected, they instantly appear on your phone's browser without needing to refresh!
- **`[r]`**: Refresh network interfaces and regenerate QR code without restarting the server (ideal when switching from Wi-Fi to phone hotspot).
- **`[c]`**: Cycle active network adapter if multiple connections exist.
- **`[q]`** or **`Ctrl+C`**: Stop server and quit.

---

## 📊 Phone Data Usage & Time Logs
The mobile interface now includes:
- **Zero Cellular Data Confirmation**: Live indicator verifying all transfers use direct local Wi-Fi / Hotspot sockets (**0 bytes** cellular/internet data used).
- **Session Data Transferred**: Cumulative MB / GB transferred during your session.
- **Transfer Logs & Performance**: Shows each transferred file with:
  - Total time taken (e.g. `1.8s`)
  - Effective transfer speed (e.g. `14.2 MB/s`)
  - File size (e.g. `24.5 MB`)

