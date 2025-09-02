import { AuthenticationState } from "baileys";

export interface authStateTypes {
  state: AuthenticationState;
  saveCreds: () => void;
}

export type SockConnectionTypes =
  | "Connected"
  | "Flagged"
  | "Initializing"
  | "Closed";
export type SockMessageTypes =
  | "sent"
  | "something went wrong"
  | "session closed";

export type SockSessionTypes = "Pending" | "Closed" | "Connected";
