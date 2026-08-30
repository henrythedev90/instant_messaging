import { GroupChat, GroupChatMessage, GroupMember, LastMessage } from "../types/types";
import { asId } from "./ids";

function toDate(value?: Date | string): Date {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return new Date();
}

function toLastMessage(value?: LastMessage): LastMessage {
  if (!value) {
    return {
      messageId: "" as unknown as LastMessage["messageId"],
      senderUsername: "",
      text: "",
      timestamp: new Date(),
    };
  }
  return {
    ...value,
    timestamp: toDate(value.timestamp),
  };
}

export function serializeGroup(group: {
  _id?: unknown;
  groupName?: string;
  adminId?: unknown;
  members?: Array<{ userId?: unknown; username?: string; joinedAt?: Date | string }>;
  createdAt?: Date | string;
  lastMessage?: GroupChat["lastMessage"];
  updatedAt?: Date | string;
}): GroupChat {
  return {
    _id: asId(group._id) as unknown as GroupChat["_id"],
    groupName: group.groupName || "Group",
    adminId: asId(group.adminId) as unknown as GroupChat["adminId"],
    members: (group.members || []).map((member) => ({
      userId: asId(member.userId) as unknown as GroupMember["userId"],
      username: member.username || "Unknown",
      joinedAt: toDate(member.joinedAt),
    })),
    createdAt: toDate(group.createdAt),
    lastMessage: toLastMessage(group.lastMessage),
    updatedAt: toDate(group.updatedAt),
  };
}

export function serializeGroupMessage(message: GroupChatMessage): GroupChatMessage {
  return {
    ...message,
    _id: asId(message._id) as unknown as GroupChatMessage["_id"],
    groupId: asId(message.groupId) as unknown as GroupChatMessage["groupId"],
    senderId: asId(message.senderId) as unknown as GroupChatMessage["senderId"],
  };
}
