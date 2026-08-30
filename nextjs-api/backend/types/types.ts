import { ObjectId } from "mongodb";

export interface ImUser {
  _id: ObjectId;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  password: string;
  status: "online" | "offline" | "away";
}

export interface DecodedToken {
  userId: string;
  email: string;
  username?: string;
  iat: number;
  exp: number;
}

export type MessageRequestStatus = "pending" | "accepted" | "denied";

export interface MessageRequest {
  _id: string;
  fromUserId: string;
  fromUsername: string;
  toUserId: string;
  toUsername: string;
  preview: string;
  status: MessageRequestStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
}
export interface Contact {
  ownerId: ObjectId;
  contactId: ObjectId;
  contactUsername: string;
  nickname: string | null;
  addedAt: Date;
}
export interface Message {
  _id: ObjectId;
  sender: ObjectId;
  receiver: ObjectId;
  content: string;
  timestamp: Date;
  read: boolean;
}

export interface GroupChat {
  _id: ObjectId;
  groupName: string;
  adminId: ObjectId;
  members: GroupMember[];
  createdAt: Date;
  lastMessage: LastMessage;
  updatedAt: Date;
}
export interface GroupMember {
  userId: ObjectId;
  username: string;
  joinedAt: Date;
}

export interface GroupChatMessage {
  _id: ObjectId;
  groupId: ObjectId;
  senderId: ObjectId;
  senderUsername: string;
  text: string;
  timestamp: Date;
  readBy: string[];
}

export interface LastMessage {
  messageId: ObjectId;
  senderUsername: string;
  text: string;
  timestamp: Date;
}

export interface OnlineUsers {
  users: OnlineUser[];
}

export interface OnlineUser {
  userId: string;
  username?: string; // Optional for improved readability in the UI
  status: string; // More precise status tracking
}
