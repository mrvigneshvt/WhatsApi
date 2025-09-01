import { Pool } from "mysql2/promise";
import { db } from "../../Database/init";
import { BufferJSON, initAuthCreds } from "baileys";

interface AuthData {
  creds: any;
  keys?: any;
}

class State {
  constructor() {}

  public async getAuth(sessionId: string): Promise<AuthData> {
    // if (!this.db) throw new Error("DB FAILURE");

    const [rows]: any = await db.connecti0n.query(
      "SELECT auth_data FROM sessions WHERE session_id = ?",
      [sessionId]
    );

    return rows.length
      ? JSON.parse(rows[0].auth_data, BufferJSON.reviver)
      : { creds: initAuthCreds(), keys: {} };
  }

  public async saveAuth(sessionId: string, state: AuthData) {
    if (!db.connecti0n) throw new Error("DB FAILURE");
    console.log("saving auth: ", state);
    await db.connecti0n.query(
      "INSERT INTO sessions (session_id, auth_data) VALUES (?, ?) ON DUPLICATE KEY UPDATE auth_data = ?",
      [
        sessionId,
        JSON.stringify(state, BufferJSON.replacer),
        JSON.stringify(state, BufferJSON.replacer),
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
