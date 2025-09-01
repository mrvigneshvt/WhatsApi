import mysql2, { Pool } from "mysql2";
import { Config } from "../../config/init";
import { errorLogger } from "../../utils/ErrorLogger";
import mysql from "mysql2/promise";

class Database {
  public connecti0n: any;
  constructor() {}

  public async connection(pool?: number) {
    try {
      this.connecti0n = mysql.createPool({
        host: Config.db.host,
        user: Config.db.user,
        password: Config.db.password,
        database: Config.db.name,
      });

      const [rows] = await this.connecti0n.query("SELECT 1");

      console.log(rows);
    } catch (error) {
      errorLogger.logs("db-connection", error);
    }
  }

  public async verifyTable() {}
}

export const db = new Database();
