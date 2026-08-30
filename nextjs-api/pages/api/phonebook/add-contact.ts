import { NextApiRequest, NextApiResponse } from "next";
import { authenticate } from "../../../backend/middleware/authenticate";
import { getDb } from "../../../backend/config/mongodb";
import { ObjectId } from "mongodb";
import { Contact, ImUser } from "../../../backend/types/types";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const db = await getDb();
    const userId = (req as any).user.userId;
    const { contactUsername } = req.body;

    if (!contactUsername) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const existingUser = await db
      .collection("imUsers")
      .findOne<ImUser>({ username: contactUsername });

    if (!existingUser) {
      return res.status(404).json({ message: "Contact not found" });
    }

    if (existingUser._id.toString() === userId) {
      return res.status(400).json({ message: "Cannot add yourself" });
    }

    const existingContact = await db.collection("contacts").findOne<Contact>({
      ownerId: new ObjectId(userId as string),
      contactId: existingUser._id,
    });

    if (existingContact) {
      return res.status(400).json({ message: "Contact already exists" });
    }

    const newContact: Contact = {
      ownerId: new ObjectId(userId as string),
      contactId: existingUser._id,
      contactUsername: existingUser.username,
      nickname: null,
      addedAt: new Date(),
    };

    await db.collection("contacts").insertOne(newContact);

    return res.status(201).json({
      message: "Contact added successfully",
      contact: newContact,
    });
  } catch (error) {
    console.error("Error adding contact:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export default authenticate(handler);
