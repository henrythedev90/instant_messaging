import { authenticate } from "../../../backend/middleware/authenticate";
import clientPromise from "../../../backend/config/mongodb";
import { ObjectId } from "mongodb";
import { Contact } from "../../../backend/types/types";
import { NextApiRequest, NextApiResponse } from "next";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const client = await clientPromise;
  const db = client.db("Cluster0");
  const userId = (req as any).user.userId;

  if (req.method !== "PUT") {
    return res.status(405).json({ message: "Method not allowed" });
  }
  try {
    const { contactId, newName } = req.body;

    if (!contactId || !newName) {
      console.log(contactId, newName);
      return res.status(400).json({ message: "Missing required fields" });
    }

    const contact = await db.collection("contacts").findOne<Contact>({
      ownerId: new ObjectId(userId as string),
      contactId: new ObjectId(contactId as string),
    });

    if (!contact) {
      return res.status(404).json({ message: "Contact not found" });
    }

    await db.collection("contacts").updateOne(
      {
        ownerId: new ObjectId(userId as string),
        contactId: new ObjectId(contactId as string),
      },
      { $set: { nickname: newName } }
    );

    const updatedContact = await db.collection("contacts").findOne<Contact>({
      ownerId: new ObjectId(userId as string),
      contactId: new ObjectId(contactId as string),
    });

    return res.status(200).json({
      message: "Contact name updated successfully",
      contact: updatedContact,
    });
  } catch (error) {
    console.error("Error updating contact name:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export default authenticate(handler);
