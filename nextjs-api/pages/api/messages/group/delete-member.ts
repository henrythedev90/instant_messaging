// import { authenticate } from "../../../../backend/middleware/authenticate";
// import { NextApiRequest, NextApiResponse } from "next";
// import clientPromise from "../../../../backend/config/mongodb";
// import { ObjectId } from "mongodb";
// import { GroupMember } from "../../../../backend/types/types";

// async function handler(req: NextApiRequest, res: NextApiResponse) {
//     const client = await clientPromise;
//     const db = client.db("Cluster0");

//     if (req.method !== "DELETE") {
//         return res.status(405).json({ message: "Method not allowed" });
//     }

//     try{
//         const { groupId, memberId } = req.body;
//         const userId = (req as any).user.userId;

//         if (!groupId || !memberId) {
//             return res.status(400).json({ message: "Group ID and member ID are required" });
//         }

//         const goodByeMember: GroupMember = {
//             userId: new ObjectId(memberId as string),
//             username: "",
//             joinedAt: new Date(),
//         }

//     }catch(error){
//         console.error("Error deleting member from group:", error);
//         res.status(500).json({ message: "Internal server error" });
//     }
// }

// export default authenticate(handler);
