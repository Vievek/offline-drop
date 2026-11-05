import readline from 'readline';
import { NetworkDiscovery } from '../network/discovery';
import { SessionManager } from '../security/session';
import { StorageManager } from '../transfer/storage';
import { QrGenerator } from '../qr/generator';
import { startServer, ServerInstance } from '../server/server';
import { TelemetryHub } from '../transfer/progress';
import { TerminalUI } from './ui';
import { openWindowsFilePicker } from './picker';

export async function runCli(): Promise<void> {
  const args = process.argv.slice(2);

  // Initialize storage
  StorageManager.init();

  // If user passed files or folders via CLI: `drop file1.pdf my-folder/`
  for (const arg of args) {
    if (!arg.startsWith('-')) {
      const added = StorageManager.addSharedPath(arg);
      if (added) {
        console.log(`[+] Added to share: ${added.name} (${added.isDirectory ? 'Directory' : 'File'})`);
      }
    }
  }

  // Start HTTP + WebSocket server on 0.0.0.0
  const instance: ServerInstance = await startServer(3000);

  let interfaces = NetworkDiscovery.getLanInterfaces();
  let selectedIndex = 0;

  const renderDashboard = () => {
    TerminalUI.showBanner();
    interfaces = NetworkDiscovery.getLanInterfaces();

    if (interfaces.length === 0) {
      console.log('⚠ No active Wi-Fi or Hotspot interface detected.');
      console.log('Please connect your laptop to your Wi-Fi router or phone Hotspot, then press [r] to refresh.');
      TerminalUI.renderKeyHints();
      return;
    }

    if (selectedIndex >= interfaces.length) {
      selectedIndex = 0;
    }

    TerminalUI.renderInterfaces(interfaces, selectedIndex);

    const activeIface = interfaces[selectedIndex];
    const sessionToken = SessionManager.getToken();
    const serverUrl = `http://${activeIface.address}:${instance.port}/?token=${sessionToken}`;

    TerminalUI.renderConnectionCard(serverUrl, SessionManager.getPin(), StorageManager.getUploadDir());
    QrGenerator.printTerminal(serverUrl);
    TerminalUI.renderKeyHints();
  };

  renderDashboard();

  // Handle interactive keyboard commands
  if (process.stdin.isTTY) {
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);

    process.stdin.on('keypress', async (_str, key) => {
      if (key.ctrl && key.name === 'c') {
        process.exit();
      }

      if (key.name === 'q') {
        process.exit();
      }

      // [f] Open Windows native file picker to select multiple files
      if (key.name === 'f') {
        console.log('\n📂 Opening Windows File Picker... Please select file(s).');
        const selected = await openWindowsFilePicker();
        if (selected.length > 0) {
          console.log(`[+] Selected ${selected.length} file(s). Adding to share...`);
          selected.forEach((filePath) => {
            StorageManager.addSharedPath(filePath);
          });
          // Broadcast to mobile phone web UI so file list updates instantly without refresh
          TelemetryHub.broadcast({
            type: 'files_updated',
            data: { items: StorageManager.getSharedItems() },
          });
          console.log('✔ Broadcasted update to connected phones.');
        } else {
          console.log('[i] File selection cancelled or no files chosen.');
        }
        renderDashboard();
      }

      // [r] Refresh network interfaces
      if (key.name === 'r') {
        renderDashboard();
      }

      // [c] Cycle interface
      if (key.name === 'c' || key.name === 'tab') {
        if (interfaces.length > 1) {
          selectedIndex = (selectedIndex + 1) % interfaces.length;
          renderDashboard();
        }
      }
    });
  }
}
