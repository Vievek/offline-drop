import chalk from 'chalk';
import { DiscoveredInterface } from '../network/interfaces';
import { StorageManager } from '../transfer/storage';

export class TerminalUI {
  static showBanner(): void {
    console.clear();
    console.log(chalk.bold.cyan(`
=====================================================
            ⚡ OFFLINE QR DROP ⚡
   Direct Wi-Fi & Hotspot File Transfer
   (No Internet Connection Required)
=====================================================
`));
  }

  static renderInterfaces(interfaces: DiscoveredInterface[], selectedIndex: number): void {
    console.log(chalk.yellow('📡 Network Interfaces Found:'));
    interfaces.forEach((iface, idx) => {
      const isSelected = idx === selectedIndex;
      const prefix = isSelected ? chalk.green.bold(' ❯ [*] ') : chalk.gray('   [ ] ');
      const kindBadge =
        iface.kind === 'hotspot'
          ? chalk.bgMagenta.black(' HOTSPOT ')
          : iface.kind === 'wifi'
          ? chalk.bgBlue.black(' WI-FI ')
          : chalk.bgGray.black(' ETHERNET ');

      console.log(
        `${prefix}${kindBadge} ${chalk.bold.white(iface.name.padEnd(16))} ${chalk.cyan(iface.address.padEnd(15))} ${chalk.dim(`(${iface.label})`)}`
      );
    });
    console.log();
  }

  static renderConnectionCard(url: string, pin: string, uploadDir: string): void {
    console.log(chalk.green('✔ Server Ready & Listening on all interfaces (0.0.0.0)'));
    console.log(chalk.bold.white('🔗 Mobile URL : ') + chalk.underline.cyan(url));
    console.log(chalk.bold.white('🔑 Session PIN: ') + chalk.bold.yellow(pin));
    console.log(chalk.bold.white('📁 Storage Dir: ') + chalk.green(uploadDir));
    
    const sharedItems = StorageManager.getSharedItems();
    console.log(chalk.bold.white('📦 Shared Files: ') + chalk.yellow(`${sharedItems.length} file(s)/folder(s)`));
    sharedItems.slice(-3).forEach(item => {
      console.log(chalk.dim(`   • ${item.name} (${item.isDirectory ? 'Directory' : Math.round(item.size / 1024) + ' KB'})`));
    });
    if (sharedItems.length > 3) {
      console.log(chalk.dim(`   ... and ${sharedItems.length - 3} more`));
    }

    console.log();
    console.log(chalk.yellow('📱 Scan this QR code on your phone (Samsung S25 FE):'));
  }

  static renderKeyHints(): void {
    console.log();
    console.log(chalk.dim('───────────────────────────────────────────────────────────────────'));
    console.log(
      chalk.white.bold('[f] ') + chalk.cyan('Pick Files to Share') + '  |  ' +
      chalk.white.bold('[r] ') + chalk.gray('Refresh') + '  |  ' +
      chalk.white.bold('[c] ') + chalk.gray('Switch Adapter') + '  |  ' +
      chalk.white.bold('[q] ') + chalk.gray('Quit')
    );
    console.log(chalk.dim('───────────────────────────────────────────────────────────────────'));
  }
}
