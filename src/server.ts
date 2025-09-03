import { Config } from "../config/init";
import { errorLogger } from "../utils/ErrorLogger";
import { db } from "./Database/init";
import { stateSaver } from "./WWserver/utils/state";
import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import { clients, whatServer } from "./WWserver/init";
import cors from "cors";
import { Server } from "socket.io";
import http from "http";
import crypto from "crypto";
import { ServExpress } from "./Servexpress/init";

const app = express();

app.use(cors({ origin: Config.cors || ["http://localhost:5173"] }));
app.use(bodyParser.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: Config.cors || ["http://localhost:5173"],
    methods: ["GET", "POST"],
  },
});

io.on("connection", (session) => {
  console.log(`Client Connected: ${session.id}`);

  session.on("init-session", async (sessionId) => {
    console.log("INT session ", sessionId);

    await whatServer.connection("vicky", sessionId, "localFS", session);
  });

  session.on("sessions", async () => {
    const clean = Array.from(clients.entries()).map(([id, { status }]) => ({
      sessionId: id,
      status,
    }));
    session.emit("session-send", JSON.stringify(clean));
  });

  session.on("disconnect", (cb) => {
    console.log("Client Disconnected ", cb);
  });
});

const port = Config.serverPort;
const exPort = Config.expressPort;

app.get("/ping", async (req, res) => {
  res.status(200).send("BONG !");
});

app.get("/clients", async (req, res) => {
  const totalMap = await whatServer.listConnections();

  console.log("LOGGING CLIENTS: ", clients, "//", totalMap);
  res.status(200).send("BONG !");
});

app.listen(exPort, "0.0.0.0", async () => {
  try {
    console.log("Init Express");
  } catch (error) {
    errorLogger.logs("express start", error);
  }
});

app.post("/sendMessage", async (req: Request, res: Response) => {
  try {
    const { message, authSession, cNum } = req.body;

    if (
      typeof message !== "string" ||
      typeof authSession !== "string" ||
      typeof cNum !== "string"
    ) {
      ServExpress.send(res, 400, false, "Invalid Type of Body ");
      return;
    }
    if (!clients.has(authSession)) {
      ServExpress.send(res, 404, false, "NO SESSION FOUND");
      return;
    }

    if (cNum.length < 10) {
      ServExpress.send(res, 400, false, "BAD REQUEST INVALID CNUM LENGTH");
      return;
    }

    let jid = whatServer.valNretJID(cNum);

    if (!jid) {
      ServExpress.send(res, 400, false, "Invalid cNUM");
      return;
    }

    const sendMessage = await whatServer.sendMessage(authSession, jid, message);

    let status;

    switch (sendMessage) {
      case "sent":
        status = 200;
        break;
      case "session closed":
        status = 502;
        break;
      case "something went wrong":
        status = 500;
        break;
    }

    ServExpress.send(res, status, status == 200 ? true : false, sendMessage);

    return;
  } catch (error) {
    errorLogger.logs("/sendMessage", error);
  }
});

server.listen(port, "0.0.0.0", async () => {
  console.log("🚀 Server Running on PORT", port);
  try {
    await db.connection();
    await whatServer.RestartCrash();
  } catch (error) {
    errorLogger.logs("start", error);
    process.exit(1);
  }
});
