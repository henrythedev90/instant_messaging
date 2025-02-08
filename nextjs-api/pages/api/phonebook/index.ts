import { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "../../../backend/config/mongodb";
import { Phonebook } from "../../../backend/types/types";
import { authenticate } from "../../../backend/middleware/authenticate";
import { ObjectId } from "mongodb";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const client = await clientPromise;
  const db = client.db("Cluster0");

  if (req.method !== "GET") {
    return res.status(405).json({
      message: "Method not allowed",
      allowedMethod: "GET",
      receivedMethod: req.method,
    });
  }

  try {
    const userId = (req as any).user.userId;

    const phonebook = await db
      .collection("phonebook")
      .find<Phonebook>({ userId: new ObjectId(userId as string) })
      .toArray();

    res.status(200).json(phonebook);
  } catch (error) {
    console.error("Error fetching phonebook:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export default authenticate(handler);
