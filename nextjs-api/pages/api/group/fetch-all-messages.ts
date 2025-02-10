import { NextApiRequest, NextApiResponse } from "next";
import { authenticate } from "../../../backend/middleware/authenticate";
import clientPromise from "../../../backend/config/mongodb";
import { ObjectId } from "mongodb";
import { GroupMember } from "../../../backend/types/types";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const client = await clientPromise;
  const db = client.db("Cluster0");
  const currentUser = (req as any).user.username;
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { groupId } = req.query;
    const groupChat = await db
      .collection("groupChats")
      .findOne({ _id: new ObjectId(groupId as string) });

    if (!groupChat) {
      return res.status(404).json({ message: "Group chat not found" });
    }

    const isMember = groupChat.members.some(
      (member: GroupMember) => member.username === currentUser
    );

    if (!isMember) {
      return res
        .status(403)
        .json({ message: "You are not a member of this group" });
    }

    return res.status(200).json({ messages: groupChat.messages });
  } catch (error) {
    console.error("Error fetching all messages:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export default authenticate(handler);

// http://localhost:3000/api/group/fetch-all-messages?groupId=67aa2cf35a5b1e4d809779b6
