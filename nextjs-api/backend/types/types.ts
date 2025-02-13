import { ObjectId } from "mongodb";

export interface ImUser {
  _id: ObjectId;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  password: string;
}

export interface DecodedToken {
  userId: string;
  email: string;
  iat: number;
  exp: number;
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
  status: "delivered" | "read";
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
  status: "delivered" | "read";
}

export interface LastMessage {
  messageId: ObjectId;
  senderUsername: string;
  text: string;
  timestamp: Date;
}
