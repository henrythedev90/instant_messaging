import jwt from "jsonwebtoken";

let blacklistTokens: Set<string> = new Set();
const JWT_SECRET = process.env.JWT_SECRET as string;

function blacklistTokenTracker(token: string) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    blacklistTokens.add(token);

    const expTime = (decoded as { exp: number })?.exp;
    if (expTime) {
      const timeLeft = expTime * 1000 - Date.now();
      setTimeout(() => {
        blacklistTokens.delete(token);
      }, timeLeft);
    }
  } catch (error) {
    console.error("Invalid token:", error);
  }
}

function isTokenBlacklisted(token: string): boolean {
  return blacklistTokens.has(token);
}

export { blacklistTokens, blacklistTokenTracker, isTokenBlacklisted };
