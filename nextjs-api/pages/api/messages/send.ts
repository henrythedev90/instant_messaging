import { NextApiRequest, NextApiResponse } from "next";
import { getDb } from "../../../backend/config/mongodb";
import { ObjectId } from "mongodb";
import { Message, Contact } from "../../../backend/types/types";
import { authenticate } from "../../../backend/middleware/authenticate";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const db = await getDb();
    const { receiver, receiverId, receiverName, content } = req.body;
    const senderId = (req as any).user.userId;
    const senderUsername = (req as any).user.username;

    if (!content || content.trim() === "") {
      return res
        .status(400)
        .json({ message: "Message content cannot be empty" });
    }

    let receiverObjectId: ObjectId | null = null;

    if (receiver || receiverId) {
      const rawId = String(receiver || receiverId);
      if (!ObjectId.isValid(rawId)) {
        return res.status(400).json({ message: "Invalid receiver ID" });
      }
      receiverObjectId = new ObjectId(rawId);
    } else if (receiverName) {
      if (receiverName === senderUsername) {
        return res
          .status(400)
          .json({ message: "Cannot send message to yourself" });
      }

      const namedContact = await db.collection("contacts").findOne<Contact>({
        ownerId: new ObjectId(senderId as string),
        contactUsername: receiverName,
      });

      if (!namedContact) {
        return res.status(403).json({
          message: "Cannot send message to users not in your contacts",
        });
      }
      receiverObjectId = new ObjectId(namedContact.contactId);
    } else {
      return res.status(400).json({ message: "Receiver is required" });
    }

    if (receiverObjectId.toString() === senderId) {
      return res
        .status(400)
        .json({ message: "Cannot send message to yourself" });
    }

    const isContact = await db.collection("contacts").findOne<Contact>({
      ownerId: new ObjectId(senderId as string),
      contactId: receiverObjectId,
    });

    if (!isContact) {
      return res.status(403).json({
        message: "Cannot send message to users not in your contacts",
      });
    }

    const savedMessage: Message = {
      _id: new ObjectId(),
      sender: new ObjectId(senderId as string),
      receiver: receiverObjectId,
      content: content.trim(),
      timestamp: new Date(),
      read: false,
    };

    await db.collection("messages").insertOne(savedMessage);

    res.status(201).json({
      message: "Message sent successfully",
      savedMessage,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export default authenticate(handler);
