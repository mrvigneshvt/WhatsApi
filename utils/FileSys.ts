import fs from "fs";
import path from "path";

export class FileSystem {
  public static authPath(sId: string) {
    return path.join(__dirname, "sessions", sId);
  }
  public static async deletePath(
    targetPath: string
  ): Promise<"path not exist" | "deleted" | "error"> {
    try {
      if (!fs.existsSync(targetPath)) {
        console.log("Path does not exist:", targetPath);
        return "path not exist";
      }

      const stat = fs.statSync(targetPath);

      if (stat.isDirectory()) {
        fs.rmSync(targetPath, { recursive: true, force: true });
        console.log("Directory deleted:", targetPath);
      } else {
        fs.unlinkSync(targetPath);
        console.log("File deleted:", targetPath);
      }

      return "deleted";
    } catch (error) {
      console.error("Error deleting path:", error);
      return "error";
    }
  }
}
