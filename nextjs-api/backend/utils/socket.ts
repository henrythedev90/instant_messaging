import { io } from "socket.io-client";

// Function to retrieve the authentication token from localStorage
const getAuthToken = (): string | null => {
  if (typeof window !== "undefined" && window.localStorage) {
    return localStorage.getItem("token"); // Retrieve token from localStorage
  }
  return null; // Return null if running on the server
};

const token = getAuthToken();

// Create socket connection with authentication token and reconnection options
const socket = io("http://localhost:3000", {
  auth: {
    token: token, // Pass token in the auth object
  },
  reconnection: true, // Enable reconnection on disconnection
  transports: ["websocket"], // Use WebSocket transport for real-time communication
  timeout: 10000, // Set a timeout for the connection
});

// Handle socket connection errors
socket.on("connect_error", (error) => {
  console.error("Socket connection error:", error);
});

// Optionally handle reconnection attempts and success
socket.on("reconnect_attempt", (attempt) => {
  console.log(`Reconnecting: Attempt ${attempt}`);
});

socket.on("reconnect", () => {
  console.log("Reconnected to socket server");
});

socket.on("reconnect_failed", () => {
  console.error("Reconnection failed");
});

// Log successful connection
socket.on("connect", () => {
  console.log("Connected to socket server with id:", socket.id);
});

export default socket;
