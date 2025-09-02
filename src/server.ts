import { Config } from "../config/init";
import { errorLogger } from "../utils/ErrorLogger";
import { db } from "./Database/init";
import { stateSaver } from "./WWserver/utils/state";
import express from "express";
import bodyParser from "body-parser";
import { whatServer } from "./WWserver/init";
import cors from "cors";
import { Server } from "socket.io";
import http from "http";
import crypto from "crypto";

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

    await whatServer.connection(sessionId, session);

    // const { sock, qrServer } = data;

    // console.log("Resposnse from WhatServer:", sock, qrServer);

    // sock.ev.on("connection.update", (cb) => {
    //   console.log("Receiving Connection Update CB");
    //   console.log("outer");

    //   session.emit("connection-update", { sessionId, ...cb });
    // });

    // sock.ev.on("creds.update", async () => {
    //   console.log("outer update");
    //   await stateSaver.saveAuth(sessionId, sock.authState);
    // });
  });

  session.on("disconnect", (cb) => {
    console.log("Client Disconnected ", cb);
  });
});

const port = Config.serverPort;

app.listen();

server.listen(port, "0.0.0.0", async () => {
  console.log("🚀 Server Running on PORT", port);
  try {
    await db.connection();
  } catch (error) {
    errorLogger.logs("start", error);
    process.exit(1);
  }
});
