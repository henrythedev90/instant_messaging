import { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "../../../backend/config/mongodb";
import { Message } from "../../../backend/types/types";
import { authenticate } from "../../../backend/middleware/authenticate";
import { ObjectId } from "mongodb";
async function handler(req: NextApiRequest, res: NextApiResponse) {
  const client = await clientPromise;
  const db = client.db("Cluster0");

  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const userId = (req as any).user.userId;

    console.log("Fetching inbox for userId:", userId);

    const inbox = await db
      .collection("messages")
      .find<Message>({ receiver: new ObjectId(userId as string) })
      .sort({ timestamp: -1 })
      .toArray();

    if (!inbox.length) {
      console.log("No messages found for receiver:", userId);
    }

    res.status(200).json({ inbox });
  } catch (error) {
    console.error("Error fetching inbox:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export default authenticate(handler);
