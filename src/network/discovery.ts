import os from 'os';
import { DiscoveredInterface, InterfaceKind } from './interfaces';

/**
 * Intelligent adapter classifier:
 * Classifies Windows adapters based on adapter name and subnet ranges.
 * Hotspots typically assign:
 * - 192.168.137.x (Windows ICS default)
 * - 192.168.43.x (Android default)
 * - 172.20.10.x (iOS default)
 * Wi-Fi interfaces typically contain "Wi-Fi", "WLAN", "Wireless", or standard 192.168.1.x / 192.168.0.x / 10.x.x.x
 */
export function classifyInterface(name: string, ip: string): { kind: InterfaceKind; score: number; label: string } {
  const lowerName = name.toLowerCase();

  // Exclude virtual adapters
  if (
    lowerName.includes('wsl') ||
    lowerName.includes('virtual') ||
    lowerName.includes('hyper-v') ||
    lowerName.includes('vethernet') ||
    lowerName.includes('docker') ||
    lowerName.includes('vmware') ||
    lowerName.includes('virtualbox') ||
    lowerName.includes('bluetooth') ||
    lowerName.includes('loopback')
  ) {
    return { kind: 'other', score: 0, label: 'Virtual/Internal' };
  }

  // Windows APIPA (not connected)
  if (ip.startsWith('169.254.')) {
    return { kind: 'other', score: 0, label: 'Unassigned (APIPA)' };
  }

  // Mobile hotspot indicators (Android S25 / phone hotspot subnets or Windows hotspot)
  if (
    ip.startsWith('192.168.43.') ||
    ip.startsWith('192.168.137.') ||
    ip.startsWith('172.20.10.') ||
    lowerName.includes('hotspot')
  ) {
    return {
      kind: 'hotspot',
      score: 95,
      label: 'Mobile Hotspot (Phone / Portable Wi-Fi)',
    };
  }

  // Standard Wi-Fi
  if (lowerName.includes('wi-fi') || lowerName.includes('wlan') || lowerName.includes('wireless')) {
    return {
      kind: 'wifi',
      score: 90,
      label: 'Wi-Fi (Home / Office LAN)',
    };
  }

  // Standard Ethernet
  if (lowerName.includes('ethernet') || lowerName.includes('eth')) {
    return {
      kind: 'ethernet',
      score: 80,
      label: 'Ethernet (Wired LAN)',
    };
  }

  return {
    kind: 'other',
    score: 50,
    label: 'LAN Interface',
  };
}

export class NetworkDiscovery {
  /**
   * Discover and rank all valid IPv4 LAN interfaces on this machine
   */
  static getLanInterfaces(): DiscoveredInterface[] {
    const interfaces = os.networkInterfaces();
    const discovered: DiscoveredInterface[] = [];

    for (const [name, netList] of Object.entries(interfaces)) {
      if (!netList) continue;

      for (const net of netList) {
        // Skip IPv6, loopback, and internal
        if (net.family !== 'IPv4' || net.internal) {
          continue;
        }

        const { kind, score, label } = classifyInterface(name, net.address);
        if (score === 0) {
          continue; // Filtered out virtual / APIPA interfaces
        }

        discovered.push({
          name,
          address: net.address,
          netmask: net.netmask,
          family: 'IPv4',
          mac: net.mac,
          kind,
          score,
          label,
          isLikelyDefault: false,
        });
      }
    }

    // Sort by priority score (Hotspot/Wi-Fi > Ethernet > other)
    discovered.sort((a, b) => b.score - a.score);

    if (discovered.length > 0) {
      discovered[0].isLikelyDefault = true;
    }

    return discovered;
  }
}

