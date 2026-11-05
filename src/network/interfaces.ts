export type InterfaceKind = 'wifi' | 'hotspot' | 'ethernet' | 'other';

export interface DiscoveredInterface {
  name: string;
  address: string;
  netmask: string;
  family: 'IPv4';
  mac: string;
  kind: InterfaceKind;
  isLikelyDefault: boolean;
  score: number;
  label: string;
}

