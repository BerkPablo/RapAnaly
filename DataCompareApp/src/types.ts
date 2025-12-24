export interface ShotData {
  no: number;
  exitVelocity: number; // mph
  launchAngle: number; // deg
  exitDirection: number; // deg
  distance: number; // ft
  timestamp?: string;
}

export type DeviceType = 'MLM_DS' | 'PRO_2_0' | 'PRO_3_0';

export type SessionType = 'TEE' | 'SOFT_TOSS' | 'OTHER';

export interface SessionData {
  id: string;
  date: string;
  type: SessionType;
  mlmShots: ShotData[];
  pro2Shots: ShotData[];
  pro3Shots: ShotData[];
}
