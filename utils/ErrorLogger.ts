import path from "path";
import fs from "fs";
import { Config } from "../config/init";

class Errorlogger {
  private logFilePath: string;
  constructor(logFilePath: string) {
    this.logFilePath = logFilePath;
  }

  public async logs(text: string, error: unknown) {
    const date = new Date();
    const localTime = date.toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
    });

    const logDir = path.dirname(this.logFilePath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    console.log(this.logFilePath);
    fs.appendFileSync(
      this.logFilePath,
      `ERROR in ${text} Ocuured at ${localTime} :\n ${String(error)}\n\n\n`
    );

    console.log(text, error);
  }
}

export const errorLogger = new Errorlogger(
  `${Config.errorLogger.path}/${Config.errorLogger.fileName}`
);
