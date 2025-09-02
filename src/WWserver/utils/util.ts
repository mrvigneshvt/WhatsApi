// utils.ts
export function base64ToBuffer(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (Array.isArray(obj)) return obj.map(base64ToBuffer);

  if (typeof obj === "object") {
    if (obj.type === "Buffer" && typeof obj.data === "string") {
      return Buffer.from(obj.data, "base64"); // ✅ convert to Buffer
    }
    const newObj: any = {};
    for (const key of Object.keys(obj)) {
      newObj[key] = base64ToBuffer(obj[key]);
    }
    return newObj;
  }

  return obj;
}

export function bufferToBase64(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (Buffer.isBuffer(obj)) {
    return { type: "Buffer", data: obj.toString("base64") };
  }

  if (Array.isArray(obj)) return obj.map(bufferToBase64);

  if (typeof obj === "object") {
    const newObj: any = {};
    for (const key of Object.keys(obj)) {
      newObj[key] = bufferToBase64(obj[key]);
    }
    return newObj;
  }

  return obj;
}

export function fixInitBuffers(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (Array.isArray(obj)) return obj.map(fixInitBuffers);

  if (typeof obj === "object") {
    // Handle Buffers saved as { type: "Buffer", data: ... }
    if (obj.type === "Buffer" && typeof obj.data === "string") {
      return Buffer.from(obj.data, "base64");
    }

    const newObj: any = {};
    for (const key of Object.keys(obj)) {
      // Only fix if property exists
      if (obj[key] !== undefined) newObj[key] = fixInitBuffers(obj[key]);
    }
    return newObj;
  }

  return obj;
}
