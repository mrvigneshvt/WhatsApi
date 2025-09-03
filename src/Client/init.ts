import { db } from "../Database/init";
import { StatusTypes } from "../Database/Tables/SessionDetails";
import { LogStatusTypes } from "../Database/Tables/SessionLogs";
import { SockSessionTypes } from "../WWserver/types";
import { stateSaver } from "../WWserver/utils/state";

export class AbstractClient {
  public static async update(
    sId: string,
    logs: LogStatusTypes,
    db: StatusTypes
  ) {
    await stateSaver.appendLog(sId, logs);
    await stateSaver.updateStatus(sId, db);

    if (logs == "Disconnected" && db == "Disconnected") {
    }
  }
}
