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
