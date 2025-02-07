import { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import clientPromise from "../../../backend/config/mongodb";
import { authenticate } from "../../../backend/middleware/authenticate";
import { ObjectId } from "mongodb";
import { DecodedToken } from "../../../backend/types/types";

interface AuthenticatedRequest extends NextApiRequest {
  user: DecodedToken;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res
      .status(400)
      .json({ message: "Current password and new password are required." });
  }

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    // Get the authenticated user (assuming `authenticate` middleware adds user info to req)

    const userId = (req as AuthenticatedRequest).user.userId;

    // Find the user by ID
    const user = await db
      .collection("imUsers")
      .findOne({ _id: new ObjectId(userId as string) });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ message: "Current password is incorrect." });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update the user's password
    await db
      .collection("imUsers")
      .updateOne(
        { _id: new ObjectId(userId as string) },
        { $set: { password: hashedPassword } }
      );

    res.status(200).json({ message: "Password updated successfully!" });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export default authenticate(handler);
