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
  contacts: Contact[];
}

export interface Contact {
  contactId: ObjectId;
  nickname: string;
  addedAt: Date;
}

export interface Message {
  _id: ObjectId;
  senderId: ObjectId;
  receiverId: ObjectId;
  content: string;
  timestamp: Date;
}
