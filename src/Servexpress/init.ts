import { Response } from "express";

export class ServExpress {
  public static bodyExist(req: any, res: Response) {
    if (!req.body) {
      res.status(400).json(this.jsonRes(false, "Missing body"));
      return;
    }
  }
  public static crashResponse(res: Response, customResponse?: string) {
    return customResponse
      ? res.status(500).json({ success: false, message: customResponse })
      : res
          .status(500)
          .json(this.jsonRes(false, "Internal Server Error Try Again Later"));
  }

  public static jsonRes<T extends object = {}>(
    success: boolean,
    message: string,
    options?: T
  ): { success: boolean; message: string } & T {
    return {
      success,
      message,
      ...(options ?? {}),
    } as { success: boolean; message: string } & T;
  }

  public static send(
    res: Response,
    code: number,
    success: boolean,
    message: string,
    options?: any
  ) {
    return res.status(code).json(this.jsonRes(success, message, options));
  }
}
