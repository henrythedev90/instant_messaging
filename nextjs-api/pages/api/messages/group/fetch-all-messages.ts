import { NextApiRequest, NextApiResponse } from "next";
import { authenticate } from "../../../../backend/middleware/authenticate";
import { getDb } from "../../../../backend/config/mongodb";
import { ObjectId } from "mongodb";
import { GroupChat, GroupChatMessage } from "../../../../backend/types/types";
import { serializeGroup, serializeGroupMessage } from "../../../../backend/utils/groups";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const db = await getDb();
    const userId = (req as any).user.userId;
    const { groupId } = req.query;

    if (groupId) {
      if (!ObjectId.isValid(groupId as string)) {
        return res.status(400).json({ message: "Invalid group ID" });
      }

      const group = await db.collection("groupChats").findOne<GroupChat>({
        _id: new ObjectId(groupId as string),
        members: { $elemMatch: { userId: new ObjectId(userId as string) } },
      });

      if (!group) {
        return res.status(404).json({ message: "Group chat not found" });
      }

      const messages = await db
        .collection("groupChatsMessages")
        .find<GroupChatMessage>({
          groupId: new ObjectId(groupId as string),
        })
        .sort({ timestamp: 1 })
        .toArray();

      return res.status(200).json({
        groups: {
          ...serializeGroup(group),
          messages: messages.map((message) => serializeGroupMessage(message)),
        },
      });
    }

    const groupChats = await db
      .collection("groupChats")
      .find<GroupChat>({
        members: { $elemMatch: { userId: new ObjectId(userId as string) } },
      })
      .toArray();

    return res.status(200).json({
      groups: groupChats.map((chat) => serializeGroup(chat)),
    });
  } catch (error) {
    console.error("Error fetching group messages:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export default authenticate(handler);
