import { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "../../backend/config/mongodb";
import bcrypt from "bcryptjs";
import { ImUser } from "../../backend/types/types";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const client = await clientPromise;

  const db = client.db("Cluster0");

  if (req.method === "GET") {
    try {
      const users = await db.collection("imUsers").countDocuments();

      res.status(200).json({
        message: "Users fetched successfully",
        timestamp: Date.now().toString(),
        usersCount: users,
      });
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  } else if (req.method === "POST") {
    const { email, username, firstName, lastName, password } = req.body;

    if (!email || !username || !firstName || !lastName || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    try {
      const existingUser = await db
        .collection("imUsers")
        .findOne({ $or: [{ email }, { username }] });

      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser: ImUser = {
        _id: new ObjectId(),
        email: email.toLowerCase(),
        username,
        firstName,
        lastName,
        password: hashedPassword,
      };

      const token = jwt.sign(
        {
          userId: newUser._id.toString(),
          email: newUser.email,
          username: newUser.username,
        },
        process.env.JWT_SECRET as string,
        { expiresIn: "1h" }
      );

      const refreshToken = jwt.sign(
        {
          userId: newUser._id.toString(),
          email: newUser.email,
          username: newUser.username,
        },
        process.env.JWT_SECRET as string,
        { expiresIn: "7d" }
      );

      await db.collection("imUsers").insertOne(newUser);

      res.status(201).json({
        message: "User created successfully",
        timestamp: Date.now().toString(),
        newUser: {
          email: newUser.email,
          username: newUser.username,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
        },
        token: token,
        refreshToken: refreshToken,
      });
    } catch (error: any) {
      console.error("Error creating user:", error);
      res
        .status(500)
        .json({ name: error.name, message: error.message, stack: error.stack });
    }
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}
