export class SessionLogs {
  public static tableName = "session_logs";

  public static column = {
    id: {
      name: "id",
    },
    sessionId: {
      name: "sessionId",
    },
    status: {
      name: "status",
      types: ["Connected", "Disconnected"] as LogStatusTypes[],
    },
    createdAt: {
      name: "createdAt",
    },
  };
}

export type LogStatusTypes = "Connected" | "Disconnected";
