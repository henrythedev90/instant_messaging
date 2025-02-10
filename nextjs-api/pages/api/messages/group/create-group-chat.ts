import { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "../../../../backend/config/mongodb";
import { ObjectId } from "mongodb";
import { authenticate } from "../../../../backend/middleware/authenticate";
import { GroupChat } from "../../../../backend/types/types";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const client = await clientPromise;
  const db = client.db("Cluster0");

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { groupName, members } = req.body;
    const userId = (req as any).user.userId;
    const currentUser = (req as any).user.username;

    const allMembers = [currentUser, ...members];
    const userData = await db
      .collection("imUsers")
      .find({
        username: { $in: allMembers },
      })
      .toArray();

    const memberUserNames = [...new Set(userData.map((user) => user.username))];

    const groupChat: GroupChat = {
      _id: new ObjectId(),
      groupName: groupName,
      members: memberUserNames.map((username: string) => ({
        userId: new ObjectId(
          userData.find((user) => user.username === username)
            ?._id as unknown as string
        ),
        username: username,
        joinedAt: new Date(),
      })),
      createdAt: new Date(),
      messages: [],
      admin: {
        _id: new ObjectId(userId as string),
        username: currentUser,
      },
    };

    const result = await db.collection("groupChats").insertOne(groupChat);

    return res
      .status(201)
      .json({ message: "Group chat created successfully", result });
  } catch (error) {
    console.error("Error creating group chat:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export default authenticate(handler);
