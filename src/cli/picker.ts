import { execFile } from 'child_process';

/**
 * Opens native Windows OpenFileDialog with multi-selection enabled.
 * Uses Single Thread Apartment (-STA) mode required by Windows Forms dialogs.
 */
export function openWindowsFilePicker(): Promise<string[]> {
  return new Promise((resolve) => {
    const psScript = `
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.OpenFileDialog
$dialog.Multiselect = $true
$dialog.Title = "Offline QR Drop - Select Files to Share"
$dialog.Filter = "All files (*.*)|*.*"
$res = $dialog.ShowDialog()
if ($res -eq [System.Windows.Forms.DialogResult]::OK) {
  $dialog.FileNames | ForEach-Object { [Console]::WriteLine($_) }
}
`.trim();

    execFile(
      'powershell.exe',
      ['-NoProfile', '-STA', '-Command', psScript],
      { windowsHide: false },
      (error, stdout, stderr) => {
        if (error) {
          console.error('[!] File picker error:', error.message || stderr);
          return resolve([]);
        }
        const lines = stdout
          .split(/\r?\n/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
        resolve(lines);
      }
    );
  });
}
