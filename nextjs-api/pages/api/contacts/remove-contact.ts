import { authenticate } from "../../../backend/middleware/authenticate";
import clientPromise from "../../../backend/config/mongodb";
import { ObjectId } from "mongodb";
import { Contact } from "../../../backend/types/types";
import { NextApiRequest, NextApiResponse } from "next";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const client = await clientPromise;
  const db = client.db("Cluster0");
  const userId = (req as any).user.userId;

  if (req.method !== "DELETE") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { contactId } = req.body;

    if (!contactId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const contact = await db.collection("contacts").findOne<Contact>({
      ownerId: new ObjectId(userId as string),
      contactId: new ObjectId(contactId as string),
    });

    if (!contact) {
      return res.status(404).json({ message: "Contact not found" });
    }

    await db.collection("contacts").deleteOne({
      ownerId: new ObjectId(userId as string),
      contactId: new ObjectId(contactId as string),
    });

    return res.status(200).json({
      message: "Contact removed successfully",
    });
  } catch (error) {
    console.error("Error removing contact:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
export default authenticate(handler);
