import { Pool } from "mysql2/promise";
import { db } from "../../Database/init";
import { AuthenticationState, BufferJSON, initAuthCreds } from "baileys";
import { base64ToBuffer, bufferToBase64, fixInitBuffers } from "./util";
import { errorLogger } from "../../../utils/ErrorLogger";
import {
  SessionDetails,
  StatusTypes,
} from "../../Database/Tables/SessionDetails";
import { dbChangeTypes } from "../../Database/types";
import { LogStatusTypes, SessionLogs } from "../../Database/Tables/SessionLogs";

interface AuthData {
  creds: any;
  keys?: any;
}

class State {
  constructor() {}

  public async getAuthentication(
    sId: string
  ): Promise<Record<string, any> | false> {
    try {
      const [rows]: any = await db.connecti0n.query(
        `SELECT * FROM ${SessionDetails.tableName} WHERE ${SessionDetails.column.ownerId.name} = ?`,
        [sId]
      );

      if (!rows.length) {
        return false;
      }

      return rows[0];
    } catch (error) {
      errorLogger.logs("getAuthentication: ", error);
      return false;
    }
  }

  public async listDBconnections(): Promise<Record<string, any>[]> {
    const [rows] = await db.connecti0n.query(
      `SELECT session FROM ${SessionDetails.tableName} WHERE ${SessionDetails.column.status.name} = 'Connected'`
    );
    console.log(rows, "//listConn");
    return rows;
  }

  public async appendLog(sId: string, status: LogStatusTypes) {
    const column = SessionLogs.column;
    await db.connecti0n.query(
      `INSERT INTO  ${SessionLogs.tableName} (${column.sessionId.name} , ${column.status.name}) VALUES (?,?)`,
      [sId, status]
    );
  }
  public async saveAuthentication(
    sId: string,
    oId: string,
    sessionData: any,
    status: LogStatusTypes
  ): Promise<boolean> {
    try {
      const columns = SessionDetails.column;
      const query = `
        INSERT INTO ${SessionDetails.tableName}
          (${columns.ownerId.name}, ${columns.session.name}, ${columns.status.name})
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
          ${columns.session.name} = VALUES(${columns.session.name}),
          ${columns.status.name} = VALUES(${columns.status.name}),
          ${columns.updatedAt.name} = CURRENT_TIMESTAMP
      `;

      const result = await db.connecti0n.query(query, [
        oId,
        JSON.stringify(sessionData),
        status,
      ]);

      return result.affectedRowws ? true : false;
    } catch (error) {
      errorLogger.logs("saveAuthentication: ", error);
      return false;
    }
  }

  public async updateStatus(
    oId: string,
    status: StatusTypes
  ): Promise<boolean> {
    try {
      const columns = SessionDetails.column;
      const query = `
        UPDATE ${SessionDetails.tableName}
        SET ${columns.status.name} = ?, ${columns.updatedAt.name} = CURRENT_TIMESTAMP
        WHERE ${columns.session.name} = ?
      `;

      await db.connecti0n.query(query, [status, oId]);
      return true;
    } catch (error) {
      errorLogger.logs("updateStatus: ", error);
      return false;
    }
  }

  public async getAuth(sessionId: string): Promise<{
    state: AuthenticationState;
    saveCreds: () => Promise<void>;
  }> {
    const [rows]: any = await db.connecti0n.query(
      "SELECT auth_data FROM sessions WHERE session_id = ?",
      [sessionId]
    );

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
