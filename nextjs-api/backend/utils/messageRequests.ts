import { MessageRequest, MessageRequestStatus } from "../types/types";
import { asId } from "./ids";

export function serializeMessageRequest(doc: {
  _id?: unknown;
  fromUserId?: unknown;
  fromUsername?: string;
  toUserId?: unknown;
  toUsername?: string;
  preview?: string;
  status?: MessageRequestStatus;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}): MessageRequest {
  return {
    _id: asId(doc._id),
    fromUserId: asId(doc.fromUserId),
    fromUsername: doc.fromUsername || "Unknown",
    toUserId: asId(doc.toUserId),
    toUsername: doc.toUsername || "Unknown",
    preview: doc.preview || "",
    status: doc.status || "pending",
    createdAt: doc.createdAt || new Date(),
    updatedAt: doc.updatedAt || new Date(),
  };
}
