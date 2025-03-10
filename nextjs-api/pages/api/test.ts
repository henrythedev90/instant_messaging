import { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    res.status(200).json({
      message: "Hello from the API! This is the testing route",
      timestamp: new Date().toLocaleString(),
    });
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}
