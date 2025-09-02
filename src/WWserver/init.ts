import {
  authStateTypes,
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

export const clients: Map<string, { status: SockConnectionTypes; sock: any }> =
  new Map();

class WhatServer {
  // public async connection(sId: string, session?: Socket) {
  //   let qrServer;
  //   const auth = (await stateSaver.getAuth(sId)) as any;

  //   const version = await fetchLatestBaileysVersion();

  //   console.log("baileys Version: ", version, "/\nAuth:", auth);

  //   const sock = makeWASocket({
  //     auth: state,
  //     printQRInTerminal: false,
  //     version: version.version,
  //   });

  //   sock.ev.on("creds.update", async () => {
  //     console.log("inner update: ", sock.authState);
  //     await stateSaver.saveAuth(sId, sock.authState);
  //   });

  //   sock.ev.on("connection.update", async (update) => {
  //     const { connection, qr, lastDisconnect } = update;
  //     let status: SockSessionTypes = "Pending";

  //     if (connection === "open") {
  //       console.log("connection-open:: ", update);
  //       status = "Connected";
  //       clients.set(sId, { sock, status });
  //     }

  //     if (connection === "close") {
  //       console.log("connection:closed ", update);
  //       status = "Closed";
  //       clients.set(sId, { sock: null, status });
  //       if (
  //         (lastDisconnect?.error as Boom)?.output?.statusCode ===
  //         DisconnectReason.loggedOut
  //       ) {
  //         await stateSaver.deleteAuth(sId);
  //         clients.delete(sId);
  //       } else if (
  //         (lastDisconnect?.error as Boom)?.output?.statusCode ===
  //         DisconnectReason.restartRequired
  //       ) {
  //         console.log("Restart required, reconnecting…");
  //         this.connection(sId, session);
  //         return;
  //       } else {
  //         clients.delete(sId);
  //         await stateSaver.deleteAuth(sId);
  //       }
  //     }

  //     session?.emit("connection-update", {
  //       sessionId: sId,
  //       status,
  //       qr,
  //       lastDisconnect,
  //     });
  //   });

  //   clients.set(sId, { sock, status: "Initializing" });
  // }

  public async connection(sId: string, session?: Socket) {
    const { state, saveCreds } = await stateSaver.getAuth(sId);
    const version = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      version: version.version,
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection, qr, lastDisconnect } = update;
      let status: SockSessionTypes = "Pending";

      if (connection === "open") {
        status = "Connected";
        clients.set(sId, { sock, status });
      }

      if (connection === "close") {
        const code = (lastDisconnect?.error as Boom)?.output?.statusCode;

        if (code === DisconnectReason.loggedOut) {
          await stateSaver.deleteAuth(sId);
          clients.delete(sId);
        } else if (code === DisconnectReason.restartRequired) {
          console.log("Restart required, reconnecting…");
          return this.connection(sId, session);
        } else {
          clients.set(sId, { sock: null, status: "Closed" });
        }
      }

      session?.emit("connection-update", {
        sessionId: sId,
        status,
        qr,
        lastDisconnect,
      });
    });

    clients.set(sId, { sock, status: "Initializing" });
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
    if (!client || !client.sock) {
      return "session closed";
    }
    try {
      await client.sock.sendMessage(jid, content);

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

// sock.ev.on("connection.update", async (update) => {
//   console.log("inner");

//   // console.log("connection-update ", update);
//   const { connection, qr, lastDisconnect } = update;

//   if (connection == "open") {
//     clients.set(sId, { sock, status: "Connected" });

//     session &&
//       session.emit("connection-success" as SockSessionTypes, {
//         sessionId: sId,
//         status: "Connected",
//       });

//     //flag
//   }

//   console.log("qr-serving", qr);

//   if (qr) {
//     qrServer = update.qr;
//     console.log("qr-server", qrServer);
//     session
//       ? session.emit("connection-pending" as SockSessionTypes, {
//           sessionId: sId,
//           status: "Pending",
//           qr: qrServer,
//         })
//       : this.deleteSession(sId);
//   }

//   if (connection == "close") {
//     const reason = (lastDisconnect?.error as Boom).output.statusCode;

//     if (reason === DisconnectReason.loggedOut) {
//       console.log(`Client ${sId}: Logged Out`);
//       clients.set(sId, { sock: null, status: "Flagged" });
//       await stateSaver.deleteAuth(sId);
//     } else {
//       errorLogger.logs(
//         `Session ${sId} disconnected: `,
//         lastDisconnect?.error
//       );

//       clients.delete(sId);
//     }
//   }
// });
export const whatServer = new WhatServer();
