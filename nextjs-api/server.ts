import "./backend/utils/loadEnv";
import { createServer } from "http";
import { initSocketServer } from "./backend/config/socket";

const server = createServer();
const host = Number(process.env.SOCKET_PORT || 3001);

initSocketServer(server);

server.listen(host, () => {
  console.log(`Socket Server running on http://localhost:${host}`);
});
