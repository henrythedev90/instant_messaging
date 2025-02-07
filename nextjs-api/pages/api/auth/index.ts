import { NextApiRequest, NextApiResponse } from "next";
import { authenticate } from "../../../backend/middleware/authenticate";
import clientPromise from "../../../backend/config/mongodb";
import { ObjectId } from "mongodb";
import { ImUser } from "../../../backend/types/types";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const client = await clientPromise;
  const db = client.db("Cluster0");
  const userId = (req as any).user.userId;

  if (req.method !== "GET") {
    try {
      const me = await db.collection("imUsers").findOne<ImUser>({
        _id: new ObjectId(userId as string),
      });
      if (!me) {
        return res.status(404).json({ message: "User not found" });
      }
      res.status(200).json({
        message: "User fetched successfully",
        user: me,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}

export default authenticate(handler);
