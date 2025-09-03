export class SessionDetails {
  public static tableName = "session_details";

  public static column = {
    id: {
      name: "id",
    },
    session: {
      name: "session",
    },
    ownerId: {
      name: "ownerId",
    },
    status: {
      name: "status",
      types: ["Connected", "Flagged", "Disconnected"] as StatusTypes[],
    },
    createdAt: {
      name: "createdAt",
    },
    updatedAt: {
      name: "updatedAt",
    },
  };
}

export type StatusTypes = "Connected" | "Disconnected";
