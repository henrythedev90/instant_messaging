import { NextApiRequest, NextApiResponse } from "next";

export default function authenticateOwnResource(
  req: NextApiRequest,
  res: NextApiResponse,
  next: Function
) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(403).json({ message: "No token provided" });
  }

  // Verify token logic here...
  // If token is invalid or user is not authorized
  return res.status(403).json({ message: "Forbidden" });

  // If valid, call next()
  next();
}
