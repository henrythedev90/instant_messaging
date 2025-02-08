import { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "../../../backend/config/mongodb";
import { ObjectId } from "mongodb";
import { authorizeOwnResource } from "../../../backend/middleware/authenticateOwnResource";
async function handler(req: NextApiRequest, res: NextApiResponse) {
  const client = await clientPromise;
  const db = client.db("Cluster0");

  if (req.method === "DELETE") {
    try {
      const { contactId } = req.body;
      const userId = (req as any).user.userId;

      // Update phonebook by removing the contact from the contacts array
      const result = await db
        .collection("phonebook")
        .updateOne({ userId: new ObjectId(userId as string) }, {
          $pull: {
            contacts: {
              contactId: new ObjectId(contactId as string),
            },
          },
        } as any);

      if (result.matchedCount === 0) {
        return res.status(404).json({ message: "Phonebook not found" });
      }

      if (result.modifiedCount === 0) {
        return res.status(404).json({ message: "Contact not found" });
      }

      res.status(200).json({ message: "Contact removed from phonebook" });
    } catch (error) {
      console.error("Error removing contact from phonebook:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
}

export default authorizeOwnResource(handler);
