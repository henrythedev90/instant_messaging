import { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { authenticate } from "../../../backend/middleware/authenticate";
import { getDb } from "../../../backend/config/mongodb";
import { serializeMessageRequest } from "../../../backend/utils/messageRequests";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const db = await getDb();
    const userId = new ObjectId((req as any).user.userId);
    const requests = db.collection("messageRequests");

    const [incoming, outgoing] = await Promise.all([
      requests.find({ toUserId: userId, status: "pending" }).toArray(),
      requests.find({ fromUserId: userId }).toArray(),
    ]);

    return res.status(200).json({
      incoming: incoming.map(serializeMessageRequest),
      outgoing: outgoing.map(serializeMessageRequest),
    });
  } catch (error) {
    console.error("Error fetching message requests:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export default authenticate(handler);
