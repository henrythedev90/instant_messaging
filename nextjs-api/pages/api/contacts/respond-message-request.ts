import { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { authenticate } from "../../../backend/middleware/authenticate";
import { getDb } from "../../../backend/config/mongodb";
import { Contact } from "../../../backend/types/types";
import { asId } from "../../../backend/utils/ids";
import { serializeMessageRequest } from "../../../backend/utils/messageRequests";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { requestId, action } = req.body as {
    requestId?: string;
    action?: string;
  };

  if (!requestId || (action !== "accept" && action !== "deny")) {
    return res.status(400).json({ message: "requestId and action are required" });
  }

  try {
    const db = await getDb();
    const userId = String((req as any).user.userId);
    const requests = db.collection("messageRequests");

    const request = await requests.findOne({
      _id: new ObjectId(requestId),
      toUserId: new ObjectId(userId),
    });

    if (!request) {
      return res.status(404).json({ message: "Message request not found" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ message: "This request was already handled" });
    }

    const now = new Date();
    await requests.updateOne(
      { _id: request._id },
      { $set: { status: action === "accept" ? "accepted" : "denied", updatedAt: now } }
    );

    let contact: Contact | null = null;

    if (action === "accept") {
      const fromUserId = new ObjectId(asId(request.fromUserId));
      const existing = await db.collection("contacts").findOne<Contact>({
        ownerId: new ObjectId(userId),
        contactId: fromUserId,
      });

      if (existing) {
        contact = {
          ...existing,
          ownerId: asId(existing.ownerId) as unknown as Contact["ownerId"],
          contactId: asId(existing.contactId) as unknown as Contact["contactId"],
        };
      } else {
        contact = {
          ownerId: new ObjectId(userId) as unknown as Contact["ownerId"],
          contactId: fromUserId as unknown as Contact["contactId"],
          contactUsername: request.fromUsername,
          nickname: null,
          addedAt: now,
        };
        await db.collection("contacts").insertOne(contact);
        contact = {
          ...contact,
          ownerId: userId as unknown as Contact["ownerId"],
          contactId: asId(fromUserId) as unknown as Contact["contactId"],
        };
      }
    }

    const updated = serializeMessageRequest({
      ...request,
      status: action === "accept" ? "accepted" : "denied",
      updatedAt: now,
    });

    return res.status(200).json({
      message: action === "accept" ? "Contact added" : "Request declined",
      request: updated,
      contact,
    });
  } catch (error) {
    console.error("Error responding to message request:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export default authenticate(handler);
