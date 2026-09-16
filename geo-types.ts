export type PermissionState = "granted" | "denied" | "prompt" | "unknown";

export interface Coordinates {
  lat: number;
  lng: number;
  accuracy?: number | null;
  altitude?: number | null;
  heading?: number | null;
  speed?: number | null;
  timestamp?: number;
}
