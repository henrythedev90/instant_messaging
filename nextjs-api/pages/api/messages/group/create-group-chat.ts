import { NextApiRequest, NextApiResponse } from "next";
import { getDb } from "../../../../backend/config/mongodb";
import { ObjectId } from "mongodb";
import { authenticate } from "../../../../backend/middleware/authenticate";
import { GroupChat } from "../../../../backend/types/types";
import { asId } from "../../../../backend/utils/ids";
import { serializeGroup } from "../../../../backend/utils/groups";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = await getDb();

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { groupName, members } = req.body as {
      groupName?: string;
      members?: string[];
    };
    const userId = (req as any).user.userId;
    const currentUser = (req as any).user.username as string;

    if (!Array.isArray(members) || members.length < 2) {
      return res.status(400).json({
        message: "Select at least two people to start a group chat",
      });
    }

    const uniqueNames = [
      ...new Set(
        [currentUser, ...members]
          .filter((name) => typeof name === "string" && name.trim())
          .map((name) => name.trim())
      ),
    ];

    const userData = await db
      .collection("imUsers")
      .find({ username: { $in: uniqueNames } })
      .toArray();

    if (userData.length !== uniqueNames.length) {
      return res.status(400).json({ message: "Invalid members" });
    }

    if (userData.length < 3) {
      return res.status(400).json({
        message: "A group needs you plus at least two other people",
      });
    }

    const memberIds = userData
      .map((user) => new ObjectId(asId(user._id)))
      .sort((a, b) => a.toString().localeCompare(b.toString()));

    const existingGroups = await db
      .collection("groupChats")
      .find<GroupChat>({
        "members.userId": { $all: memberIds },
      })
      .toArray();

    const existing = existingGroups.find(
      (group) => group.members.length === memberIds.length
    );

    if (existing) {
      return res.status(200).json({
        message: "Group chat already exists",
        existing: true,
        group: serializeGroup(existing),
      });
    }

    const otherNames = uniqueNames.filter((name) => name !== currentUser);
    const autoName =
      otherNames.length <= 3
        ? otherNames.join(", ")
        : `${otherNames.slice(0, 2).join(", ")} +${otherNames.length - 2}`;

    const groupChat: GroupChat = {
      _id: new ObjectId(),
      groupName: groupName?.trim() || autoName,
      members: uniqueNames.map((username) => ({
        userId: new ObjectId(
          asId(userData.find((user) => user.username === username)?._id)
        ),
        username,
        joinedAt: new Date(),
      })),
      createdAt: new Date(),
      adminId: new ObjectId(userId as string),
      lastMessage: {
        messageId: new ObjectId(),
        senderUsername: currentUser,
        text: "",
        timestamp: new Date(),
      },
      updatedAt: new Date(),
    };

    await db.collection("groupChats").insertOne(groupChat);

    return res.status(201).json({
      message: "Group chat created successfully",
      existing: false,
      group: serializeGroup(groupChat),
    });
  } catch (error) {
    console.error("Error creating group chat:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export default authenticate(handler);
