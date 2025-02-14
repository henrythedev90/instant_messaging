import express from "express";
import { createServer } from "http";
import { initSocketServer } from "./backend/config/socket";

const app = express();
const server = createServer(app);

initSocketServer(server);

server.listen(3001, () => {
  console.log("⚡ Server running on http://localhost:3001");
});
