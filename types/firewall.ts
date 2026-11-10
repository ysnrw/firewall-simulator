export type ActionType = 'ALLOW' | 'DENY';
export type NetworkZone = 'ZONE_1' | 'ZONE_2' | 'ZONE_3' | 'ANY';

export interface FirewallRule {
  id: string;
  action: ActionType;
  destination: NetworkZone;
  port: number | 'ANY';
  sourceIp: string;
}

export interface Packet {
  destination: 'ZONE_1' | 'ZONE_2' | 'ZONE_3';
  port: number;
  sourceIp: string;
}

export interface SimulationLog {
  id: string;
  timestamp: string;
  message: string;
  status: 'SUCCESS' | 'BLOCKED' | 'INFO';
}