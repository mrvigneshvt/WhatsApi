import { Config } from "../config/init";
import { errorLogger } from "../utils/ErrorLogger";
import { db } from "./Database/init";
import { stateSaver } from "./WWserver/utils/state";
import express from "express";
import bodyParser from "body-parser";
import { whatServer } from "./WWserver/init";

const app = express();
app.use(bodyParser.json());
const port = Config.serverPort;

app.post("/session", async (req, res): Promise<void> => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      res.status(400).send("bad request");
      return;
    }

    const sock = await whatServer.connection(sessionId);

    res.status(200).json({ sessionId, qr: sock.qrServer || null });
  } catch (error) {
    errorLogger.logs("post/session", error);
  }
});

app.listen(port, "0.0.0.0", async () => {
  console.log("Server Running on PORT", port);
  try {
    await db.connection();
  } catch (error) {
    errorLogger.logs("start", error);
    process.exit(1);
  }
});
