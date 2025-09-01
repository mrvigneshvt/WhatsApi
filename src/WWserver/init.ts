import { authStateTypes } from "./types";
import makeWASocket, {
  AuthenticationState,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} from "baileys";
import { stateSaver } from "./utils/state";
import qrcode from "qrcode";
import { errorLogger } from "../../utils/ErrorLogger";

const clients = new Map();

class WhatServer {
  public async connection(sId: string) {
    let qrServer;
    const auth = (await stateSaver.getAuth(sId)) as any;

    const version = await fetchLatestBaileysVersion();

    console.log("baileys Version: ", version, "/\nAuth:", auth);

    const sock = await makeWASocket({ auth, printQRInTerminal: false });

    // console.log("SOCK Version: ", sock);

    sock.ev.on(
      "creds.update",
      async () => await stateSaver.saveAuth(sId, sock.authState)
    );

    sock.ev.on("connection.update", async (update) => {
      console.log("connection-update ", update);
      const { connection, qr, lastDisconnect } = update;
      console.log("qr-serving", qr);

      if (qr) {
        qrServer = update.qr;
        console.log("qr-server", qrServer);
      }

      if (connection == "close") {
        errorLogger.logs(
          `Session ${sId} disconnected: `,
          lastDisconnect?.error
        );

        clients.delete(sId);
      }
    });

    clients.set(sId, sock);

    return { sock, qrServer };
  }

  public getClient(sId: string) {
    return clients.get(sId);
  }

  public async deleteSession(sId: string) {
    const client = this.getClient(sId);
    if (client) await client.logout();
    clients.delete(sId);
  }
}

export const whatServer = new WhatServer();
