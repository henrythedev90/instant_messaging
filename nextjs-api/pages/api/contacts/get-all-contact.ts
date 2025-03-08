import { authenticate } from "../../../backend/middleware/authenticate";
import clientPromise from "../../../backend/config/mongodb";
import { ObjectId } from "mongodb";
// import { ImUser, Contact } from "../../../backend/types/types";
import { NextApiResponse } from "next";
import { NextApiRequest } from "next";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const client = await clientPromise;
  const db = client.db("Cluster0");
  const userId = (req as any).user.userId;

  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const contacts = await db
      .collection("contacts")
      .find({ ownerId: new ObjectId(userId as string) })
      .toArray();

    return res.status(200).json({
      message: "Contacts fetched successfully",
      contacts: contacts,
    });
  } catch (error) {
    console.error("Error fetching contacts:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export default authenticate(handler);
