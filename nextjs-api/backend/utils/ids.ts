export function privateThreadId(userA: unknown, userB: unknown) {
  return [asId(userA), asId(userB)].filter(Boolean).sort().join(":");
}

export function asId(value: unknown): string {
  if (value == null) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "object") {
    const record = value as {
      $oid?: string;
      _id?: unknown;
      toHexString?: () => string;
      toString?: () => string;
    };
    if (typeof record.$oid === "string") {
      return record.$oid;
    }
    if (typeof record.toHexString === "function") {
      return record.toHexString();
    }
    if (record._id && record._id !== value) {
      return asId(record._id);
    }
    if (typeof record.toString === "function") {
      const text = record.toString();
      if (text && text !== "[object Object]") {
        return text;
      }
    }
  }
  return String(value);
}

export function normalizeMessage<T extends { _id?: unknown; sender?: unknown; receiver?: unknown }>(
  message: T
) {
  return {
    ...message,
    _id: asId(message._id),
    sender: asId(message.sender),
    receiver: asId(message.receiver),
  };
}
