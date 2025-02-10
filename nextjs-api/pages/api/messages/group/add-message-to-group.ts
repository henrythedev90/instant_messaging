import { NextApiRequest, NextApiResponse } from "next";
import { authenticate } from "../../../../backend/middleware/authenticate";
import { GroupChatMessage, GroupMember } from "../../../../backend/types/types";
import clientPromise from "../../../../backend/config/mongodb";
import { ObjectId } from "mongodb";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const client = await clientPromise;
  const db = client.db("Cluster0");
  const userId = (req as any).user.userId;

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { groupId, message } = req.body;
    const senderUsername = (req as any).user.username;

    console.log(groupId, message);

    if (!groupId || !message) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const groupChat = await db
      .collection("groupChats")
      .findOne({ _id: new ObjectId(groupId as string) });

    if (!groupChat) {
      return res.status(404).json({ message: "Group chat not found" });
    }

    const isMember = groupChat.members.some(
      (member: GroupMember) => member.username === groupChat.admin.username
    );

    if (!isMember) {
      return res
        .status(403)
        .json({ message: "You are not a member of this group" });
    }

    const newMessage: GroupChatMessage = {
      senderUsername: senderUsername,
      senderId: new ObjectId(userId as string),
      message: message,
      timestamp: new Date(),
    };

    await db
      .collection("groupChats")
      .updateOne(
        { _id: new ObjectId(groupId as string) },
        { $push: { messages: newMessage as any } }
      );

    return res.status(200).json({ message: "Message added to group" });
  } catch (error) {
    console.error("Error adding message to group:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export default authenticate(handler);
