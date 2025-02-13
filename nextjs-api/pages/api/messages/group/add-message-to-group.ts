import { NextApiRequest, NextApiResponse } from "next";
import { authenticate } from "../../../../backend/middleware/authenticate";
import { GroupChatMessage, GroupMember } from "../../../../backend/types/types";
import clientPromise from "../../../../backend/config/mongodb";
import { ObjectId } from "mongodb";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const client = await clientPromise;
  const db = client.db("Cluster0");
  const userId = (req as any).user.userId;
  const username = (req as any).user.username;

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { groupId, text } = req.body;

    console.log(groupId, text);

    if (!groupId || !text) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const groupChat = await db
      .collection("groupChats")
      .findOne({ _id: new ObjectId(groupId as string) });

    if (!groupChat) {
      return res.status(404).json({ message: "Group chat not found" });
    }

    const isMember = groupChat.members.some(
      (member: GroupMember) => member.userId.toString() === userId
    );

    if (!isMember) {
      return res
        .status(403)
        .json({ message: "You are not a member of this group" });
    }

    const newMessage: GroupChatMessage = {
      _id: new ObjectId(),
      groupId: new ObjectId(groupId as string),
      senderUsername: username,
      senderId: new ObjectId(userId as string),
      text: text,
      timestamp: new Date(),
      status: "delivered",
    };

    await db.collection("groupChatsMessages").insertOne(newMessage);

    await db.collection("groupChats").updateOne(
      { _id: new ObjectId(groupId as string) },
      {
        $set: {
          lastMessage: {
            messageId: newMessage._id,
            senderUsername: username,
            text: text,
            timestamp: new Date(),
          },
          updatedAt: new Date(),
        },
      }
    );

    return res.status(200).json({ message: "Message added to group" });
  } catch (error) {
    console.error("Error adding message to group:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export default authenticate(handler);
