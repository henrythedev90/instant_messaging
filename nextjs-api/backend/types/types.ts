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

export interface Phonebook {
  userId: ObjectId;
  username: string;
  contacts: Contact[];
}

export interface Contact {
  contactId: ObjectId;
  nickname: string;
  addedAt: Date;
}

export interface Message {
  sender: ObjectId;
  receiver: ObjectId;
  content: string;
  timestamp: Date;
}

export interface GroupChat {
  groupName: string;
  members: GroupMember[];
  createdAt: Date;
  messages: GroupChatMessage[];
  admin: {
    _id: ObjectId;
    username: string;
  };
}
export interface GroupMember {
  username: string;
  joinedAt: Date;
}

export interface GroupChatMessage {
  senderId: ObjectId;
  message: string;
  timestamp: Date;
}
