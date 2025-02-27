import express from "express";
import { createServer } from "http";
import { initSocketServer } from "./backend/config/socket";

const app = express();
const server = createServer(app);
const host = 3001;

initSocketServer(server);

server.listen(host, () => {
  console.log(`This Socket Server running on http://localhost:${host}`);
});
