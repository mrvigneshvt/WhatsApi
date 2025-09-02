import { Pool } from "mysql2/promise";
import { db } from "../../Database/init";
import { AuthenticationState, BufferJSON, initAuthCreds } from "baileys";
import { base64ToBuffer, bufferToBase64, fixInitBuffers } from "./util";

interface AuthData {
  creds: any;
  keys?: any;
}

class State {
  constructor() {}

  public async getAuth(sessionId: string): Promise<{
    state: AuthenticationState;
    saveCreds: () => Promise<void>;
  }> {
    const [rows]: any = await db.connecti0n.query(
      "SELECT auth_data FROM sessions WHERE session_id = ?",
      [sessionId]
    );

    // let authData: {
    //   creds: any;
    //   keys: { [key: string]: { [id: string]: any } };
    // };

    // if (!rows.length) {
    //   authData = { creds: initAuthCreds(), keys: {} };
    // } else if (typeof rows[0].auth_data === "string") {
    //   // ✅ parse & restore Buffers
    //   const parsed = JSON.parse(rows[0].auth_data, BufferJSON.reviver);
    //   authData = base64ToBuffer(parsed);
    // } else {
    //   // already object (but still restore Buffers)
    //   authData = base64ToBuffer(rows[0].auth_data);
    // }

    let authData: any;
    if (!rows.length) {
      authData = { creds: initAuthCreds(), keys: {} };
    } else {
      const parsed =
        typeof rows[0].auth_data === "string"
          ? JSON.parse(rows[0].auth_data, BufferJSON.reviver)
          : rows[0].auth_data;

      authData = base64ToBuffer(parsed); // must convert all nested Buffers
    }

    const creds = authData.creds;

    if (
      !Buffer.isBuffer(creds.noiseKey?.private) ||
      !Buffer.isBuffer(creds.noiseKey?.public) ||
      !Buffer.isBuffer(creds.signedIdentityKey?.private) ||
      !Buffer.isBuffer(creds.signedIdentityKey?.public)
    ) {
      console.error("⚠️ Some key fields are not Buffers!", creds);
    }

    const state: AuthenticationState = {
      creds: authData.creds,
      keys: {
        get: async (type, ids) => {
          const data: any = {};
          for (const id of ids) {
            data[id] = authData.keys[type]?.[id];
          }
          return data;
        },
        set: async (data) => {
          for (const type of Object.keys(data) as Array<keyof typeof data>) {
            authData.keys[type] = {
              ...(authData.keys[type] || {}),
              ...(data[type] as object),
            };
          }
          await saveCreds();
        },
      },
    };

    // ✅ saveCreds function
    async function saveCreds() {
      const safeData = bufferToBase64(authData);
      await db.connecti0n.query(
        "INSERT INTO sessions (session_id, auth_data) VALUES (?, ?) ON DUPLICATE KEY UPDATE auth_data = VALUES(auth_data)",
        [sessionId, JSON.stringify(safeData, BufferJSON.replacer)]
      );
    }

    return { state, saveCreds };
  }

  public async listAuth() {
    if (!db.connecti0n) throw new Error("DB FAILURE");

    console.log("listing all Auth");

    const sessions = await db.connecti0n.query(
      "SELECT session_id from sessions"
    );

    console.log(sessions, "//");
  }

  public async saveAuth(sessionId: string, state: AuthData) {
    if (!db.connecti0n) throw new Error("DB FAILURE");
    console.log("saving auth: ", state);

    const safeState = bufferToBase64(state);

    await db.connecti0n.query(
      "INSERT INTO sessions (session_id, auth_data) VALUES (?, ?) ON DUPLICATE KEY UPDATE auth_data = ?",
      [
        sessionId,
        JSON.stringify(safeState, BufferJSON.replacer),
        JSON.stringify(safeState, BufferJSON.replacer),
      ]
    );
  }

  public async deleteAuth(sessionId: string) {
    if (!db.connecti0n) throw new Error("DB FAILURE");

    await db.connecti0n.query("DELETE FROM sessions WHERE session_id = ?", [
      sessionId,
    ]);
  }
}

export const stateSaver = new State();
