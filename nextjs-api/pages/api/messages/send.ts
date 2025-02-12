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
    const { receiverNickname, content } = req.body;
    const senderId = (req as any).user.userId;
    const senderUsername = (req as any).user.username;

    if (!content || content.trim() === "") {
      return res
        .status(400)
        .json({ message: "Message content cannot be empty" });
    }

    if (receiverNickname === senderUsername) {
      return res
        .status(400)
        .json({ message: "Cannot send message to yourself" });
    }

    const senderContacts = await db
      .collection("phonebook")
      .findOne({ userId: new ObjectId(senderId as string) });

    if (
      !senderContacts ||
      !senderContacts.contacts.some(
        (contact: Contact) => contact.nickname === receiverNickname
      )
    ) {
      return res
        .status(403)
        .json({ message: "Cannot send message to users not in your contacts" });
    }

    const receiver = await db
      .collection("phonebook")
      .findOne(
        { "contacts.nickname": receiverNickname },
        { projection: { "contacts.$": 1 } }
      );

    console.log(receiver, "this is the receiver from DB");

    if (!receiver) {
      return res.status(404).json({ message: "Receiver not found" });
    }

    const message: Message = {
      sender: new ObjectId(senderId as string),
      receiver: receiver.contacts[0].contactId, // Updated this line to access contactId from the contacts array
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
