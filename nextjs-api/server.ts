import express from "express";
import { createServer } from "http";
import { initSocketServer } from "./backend/config/socket"; // This imports the socket setup

const app = express();
const server = createServer(app); // Create the HTTP server

const host = 3001;

// Initialize the socket server and pass the HTTP server instance
initSocketServer(server);

server.listen(host, () => {
  console.log(`Socket Server running on http://localhost:${host}`);
});
