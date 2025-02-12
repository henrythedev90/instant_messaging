import { NextApiRequest, NextApiResponse } from "next";
import { authenticate } from "../../../backend/middleware/authenticate";
import clientPromise from "../../../backend/config/mongodb";
import { ObjectId } from "mongodb";
import { ImUser, Contact } from "../../../backend/types/types";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const client = await clientPromise;
  const db = client.db("Cluster0");
  const userId = (req as any).user.userId;

  if (req.method === "POST") {
    const { contactUsername } = req.body;

    if (!contactUsername) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    try {
      const existingContact = await db
        .collection("imUsers")
        .findOne<ImUser>({ username: contactUsername });

      if (!existingContact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      const contactId = new ObjectId(existingContact._id);

      const existingContactInContacts = await db
        .collection("contacts")
        .findOne<Contact>({
          ownerId: new ObjectId(userId as string),
          contactId: contactId,
        });

      if (existingContactInContacts) {
        return res.status(400).json({ message: "Contact already exists" });
      }

      const newContact: Contact = {
        ownerId: new ObjectId(userId as string),
        contactId: contactId,
        contactUsername: existingContact.username,
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
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}

export default authenticate(handler);
