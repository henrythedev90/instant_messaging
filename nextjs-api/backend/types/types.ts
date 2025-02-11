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
  nickname: string;
  addedAt: Date;
}
// export interface Phonebook {
//   userId: ObjectId;
//   username: string;
//   contacts: Contact[];
// }

// export interface Contact {
//   contactId: ObjectId;
//   nickname: string;
//   addedAt: Date;
// }

export interface Message {
  sender: ObjectId;
  receiver: ObjectId;
  content: string;
  timestamp: Date;
}

export interface GroupChat {
  _id: ObjectId;
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
  userId: ObjectId;
  username: string;
  joinedAt: Date;
}

export interface GroupChatMessage {
  senderId: ObjectId;
  senderUsername: string;
  message: string;
  timestamp: Date;
}
