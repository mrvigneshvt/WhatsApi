import { AuthenticationState } from "baileys";

export interface authStateTypes {
  state: AuthenticationState;
  saveCreds: () => void;
}
