import dotenv from "dotenv";

dotenv.config();

export class Config {
  public static serverPort = Number(process.env.SERVER_PORT) || 3000;
  private static dbUrl = process.env.DATABASE;
  public static db = {
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    name: process.env.DATABASE_NAME,
  };
  public static errorLogger = {
    fileName: "error-logger-whatsapp.txt",
    path: "/home/vixyz/projects/office/WhatsApi",
  };
}
