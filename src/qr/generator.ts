import qrcodeTerminal from 'qrcode-terminal';
import QRCode from 'qrcode';

export class QrGenerator {
  /**
   * Render QR code in terminal
   */
  static printTerminal(url: string): void {
    qrcodeTerminal.generate(url, { small: true });
  }

  /**
   * Generate Data URL for browser display
   */
  static async toDataUrl(url: string): Promise<string> {
    return QRCode.toDataURL(url, {
      margin: 2,
      width: 280,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
  }
}

