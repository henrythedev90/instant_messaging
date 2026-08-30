import { NextApiRequest, NextApiResponse } from "next";
import { getDb } from "../../../backend/config/mongodb";
import { ObjectId } from "mongodb";
import { Message, Contact, ImUser } from "../../../backend/types/types";
import { authenticate } from "../../../backend/middleware/authenticate";
import { normalizeMessage } from "../../../backend/utils/ids";
import { serializeMessageRequest } from "../../../backend/utils/messageRequests";

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

    const reciprocal = await db.collection("contacts").findOne<Contact>({
      ownerId: receiverObjectId,
      contactId: new ObjectId(senderId as string),
    });

    const existingRequest = await db.collection("messageRequests").findOne({
      fromUserId: new ObjectId(senderId as string),
      toUserId: receiverObjectId,
    });

    let requiresApproval = !reciprocal;
    let requestDoc = existingRequest;

    if (!reciprocal && existingRequest?.status === "denied") {
      return res.status(403).json({
        message: "This user declined your message request",
      });
    }

    if (!reciprocal) {
      const receiverUser = await db.collection("imUsers").findOne<ImUser>({
        _id: receiverObjectId,
      });
      const now = new Date();
      const preview = content.trim().slice(0, 180);
      const payload = {
        fromUserId: new ObjectId(senderId as string),
        fromUsername: senderUsername || "Someone",
        toUserId: receiverObjectId,
        toUsername: receiverUser?.username || isContact.contactUsername,
        preview,
        status: "pending" as const,
        updatedAt: now,
      };

      if (existingRequest) {
        await db.collection("messageRequests").updateOne(
          { _id: existingRequest._id },
          { $set: payload }
        );
        requestDoc = { ...existingRequest, ...payload };
      } else {
        const created = {
          ...payload,
          createdAt: now,
        };
        const insert = await db.collection("messageRequests").insertOne(created);
        requestDoc = { _id: insert.insertedId, ...created };
      }
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
      savedMessage: normalizeMessage(savedMessage),
      requiresApproval,
      request: requestDoc ? serializeMessageRequest(requestDoc) : null,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export default authenticate(handler);
