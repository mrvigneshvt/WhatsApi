import {
  authStateTypes,
  SockConnectionArgs,
  SockConnectionTypes,
  SockMessageTypes,
  SockSessionTypes,
} from "./types";
import makeWASocket, {
  AuthenticationState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} from "baileys";
import { stateSaver } from "./utils/state";
import qrcode from "qrcode";
import { errorLogger } from "../../utils/ErrorLogger";
import { Boom } from "@hapi/boom";
import { Socket } from "socket.io";
import path from "path";
import { FileSystem } from "../../utils/FileSys";

export const clients: Map<string, { status: SockConnectionTypes; sock: any }> =
  new Map();

class WhatServer {
  public async listConnections(): Promise<Map<any, any>> {
    return clients;
  }

  public async RestartCrash() {
    const data = await stateSaver.listDBconnections();

    for (const d of data) {
      const auth = d.session.socket;
      const owner = d.session.owner;

      await this.connection(owner, auth, "localFS", undefined, {
        restart: true,
      });
    }
  }

  public async connection(
    oId: string,
    sId: string,
    type: SockConnectionArgs,
    session?: Socket,
    ops?: {
      restart: boolean;
    }
  ) {
    const sessionPath = FileSystem.authPath(sId);

    const { state, saveCreds } =
      type == "cloud"
        ? await stateSaver.getAuth(sId)
        : await useMultiFileAuthState(sessionPath);

    const version = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      version: version.version,
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection, qr, lastDisconnect } = update;

      if (qr && ops?.restart) {
        console.log("DISCONNECTED:: ", sId, "\n", "Killing....");

        try {
          await sock.logout();
        } catch (err) {
          console.warn("Error during logout:", err);
        }

        try {
          sock.ev.removeAllListeners("connection.update"); // stop listening for more events
          sock.ws.close(); // force close websocket
        } catch (err) {
          console.warn("Error closing socket:", err);
        }

        clients.set(sId, { sock: null, status: "Closed" });

        // completely exit this connection() function
        return;
      }

      console.log("connection:::::::", connection, " ////// ", update);
      let status: SockSessionTypes = "Pending";

      if (connection === "open") {
        status = "Connected";
        await stateSaver.saveAuthentication(
          sId,
          oId,
          { owner: oId, socket: sId },
          "Connected"
        );
        await stateSaver.appendLog(sId, "Connected");
        clients.set(sId, { sock, status });
      }

      if (connection === "close") {
        const code = (lastDisconnect?.error as Boom)?.output?.statusCode;

        if (code === DisconnectReason.loggedOut) {
          type == "cloud" ? await stateSaver.deleteAuth(sId) : null;
        } else if (code === DisconnectReason.restartRequired) {
          console.log("Restart required, reconnecting…");
          return this.connection(oId, sId, type, session);
        } else {
          clients.set(sId, { sock: null, status: "Closed" });
        }
        clients.set(sId, { sock: null, status: "Closed" });
        await stateSaver.updateStatus(sId, "Disconnected");
      }

      session?.emit("connection-update", {
        sessionId: sId,
        status,
        qr,
        lastDisconnect,
      });
    });

    clients.set(sId, { sock, status: "Initializing" });

    setTimeout(() => {
      const client = this.getClient(sId);
      if (client) {
        client.status !== "Connected"
          ? clients.set(sId, { sock: null, status: "Closed" })
          : null;
      }
    }, 1000 * 60);
  }
  public valNretJID(id: string): string | false {
    let cleanId = id.replace(/[^0-9]/g, "");

    if (cleanId.length === 10) {
      cleanId = "91" + cleanId;
    } else if (cleanId.length === 12 && cleanId.startsWith("91")) {
    } else if (cleanId.length === 13 && cleanId.startsWith("91")) {
      cleanId = cleanId.slice(1);
    } else {
      return false;
    }

    return `${cleanId}@s.whatsapp.net`;
  }

  public getClient(sId: string) {
    return clients.get(sId);
  }

  public async sendMessage(
    sId: string,
    jid: string,
    content: string
  ): Promise<SockMessageTypes> {
    const client = this.getClient(sId);
    if (!client || !client.sock || client.status !== "Connected") {
      return "session closed";
    }
    try {
      console.log(client, "???? Client");
      await client.sock.sendMessage(jid, {
        text: content,
      });

      return "sent";
    } catch (error) {
      errorLogger.logs(`sendMessage/${sId}:${jid}`, error);
      return "something went wrong";
    }
  }

  public async deleteSession(sId: string) {
    const isClient = clients.get(sId);

    if (isClient?.sock) {
      await isClient.sock.logout();
    }
    clients.delete(sId);
    await stateSaver.deleteAuth(sId);
  }
}

export const whatServer = new WhatServer();
