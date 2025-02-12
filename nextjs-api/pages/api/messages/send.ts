import { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "../../../backend/config/mongodb";
import { ObjectId } from "mongodb";
import { Message, Contact } from "../../../backend/types/types";
import { authenticate } from "../../../backend/middleware/authenticate";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const client = await clientPromise;
  const db = client.db("Cluster0");

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { receiverName, content } = req.body;
    const senderId = (req as any).user.userId;
    const senderUsername = (req as any).user.username;

    if (!content || content.trim() === "") {
      return res
        .status(400)
        .json({ message: "Message content cannot be empty" });
    }

    if (receiverName === senderUsername) {
      return res
        .status(400)
        .json({ message: "Cannot send message to yourself" });
    }

    const senderContacts = await db
      .collection("contacts")
      .findOne({ ownerId: new ObjectId(senderId as string) });

    if (
      !senderContacts ||
      !senderContacts.contacts.some(
        (contact: Contact) => contact.contactUsername === receiverName
      )
    ) {
      return res
        .status(403)
        .json({ message: "Cannot send message to users not in your contacts" });
    }

    const receiver = await db.collection("contacts").findOne({
      ownerId: new ObjectId(senderId as string),
      contactUsername: receiverName,
    });

    console.log(receiver, "this is the receiver from DB");

    if (!receiver) {
      return res.status(404).json({ message: "Receiver not found" });
    }

    const receiverContent = receiver.contacts.find(
      (contact: Contact) => contact.contactUsername === receiverName
    );

    const message: Message = {
      sender: new ObjectId(senderId as string),
      receiver: new ObjectId(receiverContent?.contactId as string),
      content: content,
      timestamp: new Date(),
      status: "delivered",
    };

    await db.collection("messages").insertOne(message);
    res.status(201).json({ message: "Message sent successfully" });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export default authenticate(handler);
