import { NextApiRequest, NextApiResponse } from "next";
import { authenticate } from "../../../../backend/middleware/authenticate";
import clientPromise from "../../../../backend/config/mongodb";
import { ObjectId } from "mongodb";
import { GroupChatMessage, GroupChat } from "../../../../backend/types/types";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const client = await clientPromise;
  const db = client.db("Cluster0");
  const currentUser = (req as any).user.username;
  const userId = (req as any).user.userId;
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const groupChats = await db
      .collection("groupChats")
      .find<GroupChat>({
        members: { $elemMatch: { userId: new ObjectId(userId as string) } },
      })
      .toArray();

    if (!groupChats.length) {
      return res.status(404).json({ message: "No group chats found" });
    }

    // Transform the data to include messages from all groups
    const allGroupMessages = groupChats.map((chat: GroupChat) => ({
      _id: chat._id.toString(),
      groupName: chat.groupName,
      messages: chat.messages,
    }));

    return res.status(200).json({
      groups: allGroupMessages,
    });
  } catch (error) {
    console.error("Error fetching all messages:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export default authenticate(handler);

// http://localhost:3000/api/group/fetch-all-messages?groupId=67aa2cf35a5b1e4d809779b6
