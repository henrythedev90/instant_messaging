import { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "../../../backend/config/mongodb";
import { ObjectId } from "mongodb";
import { Phonebook, Contact } from "../../../backend/types/types";
import { authenticate } from "../../../backend/middleware/authenticate";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const client = await clientPromise;
  const db = client.db("Cluster0");

  if (req.method !== "POST") {
    return res.status(405).json({
      message: "Method not allowed",
      allowedMethod: "POST",
      receivedMethod: req.method,
    });
  }

  try {
    const { nickname } = req.body;
    const userId = (req as any).user.userId;

    if (!nickname) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    if (nickname === userId) {
      return res
        .status(400)
        .json({ message: "Cannot add yourself as a contact" });
    }

    // Find the target user's ID from imUsers collection
    const contactUser = await db
      .collection("imUsers")
      .findOne({ username: nickname }, { projection: { _id: 1 } });

    if (!contactUser) {
      return res.status(400).json({ message: "User not found" });
    }

    const userPhonebook = await db.collection("phonebook").findOne({
      userId: new ObjectId(userId as string),
    });

    const newContactEntry: Contact = {
      contactId: contactUser._id,
      nickname,
      addedAt: new Date(),
    };

    if (userPhonebook) {
      // Check if contact already exists in the contacts array
      const contactExists = userPhonebook.contacts?.some(
        (contact: Contact) =>
          contact.contactId.toString() === contactUser._id.toString()
      );

      if (contactExists) {
        return res
          .status(400)
          .json({ message: "Contact already exists in phonebook" });
      }

      // Add new contact to existing phonebook
      await db
        .collection("phonebook")
        .updateOne({ userId: new ObjectId(userId as string) }, {
          $push: { contacts: newContactEntry },
        } as any);
    } else {
      // Create new phonebook entry for user
      await db.collection("phonebook").insertOne({
        userId: new ObjectId(userId as string),
        contacts: [newContactEntry],
      });
    }

    res.status(201).json({
      message: "Contact added successfully",
      contact: newContactEntry,
    });
  } catch (error) {
    console.error("Error adding contact to phonebook:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export default authenticate(handler);
