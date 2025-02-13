import { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "../../backend/config/mongodb";
import { ImUser } from "../../backend/types/types";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { email, username, password } = req.body;

  if ((!email && !username) || !password) {
    return res.status(400).json({ message: "Missing required fields" });
  }
  try {
    const client = await clientPromise;
    const db = client.db("Cluster0");

    const query: { email?: string; username?: string } = {};
    if (email) query.email = email;
    if (username) query.username = username;

    const user = await db.collection("imUsers").findOne<ImUser>(query);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        username: user.username,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: "7h" }
    );

    const refreshToken = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        username: user.username,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      message: "Login successful",
      timestamp: Date.now().toString(),
      token,
      refreshToken,
    });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
