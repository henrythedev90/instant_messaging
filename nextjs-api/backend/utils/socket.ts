import { io } from "socket.io-client";

const getAuthToken = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("token");
  }
  return null;
};

const socket = io("http://localhost:3000/", {
  auth: { token: getAuthToken() },
  reconnection: true,
  transports: ["websocket"],
});

export default socket;
