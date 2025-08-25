// server.js
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./db/ConnectDB.js";
import User from "./models/userModel.js";
import Message from "./models/messageModel.js";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
connectDB();

const PORT = process.env.PORT || 5000;

const app = express();
app.use(cors({ origin: process.env.NEXT_URL || "http://localhost:3000" })); // allow frontend
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.NEXT_URL || "https://localhost:3000" },
});

// --- SOCKET.IO ---
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join", (userEmail) => {
    if (!userEmail) return;
    const email = userEmail.toLowerCase().trim();
    socket.join(email);
    console.log(`${email} joined room`);
  });

  socket.on("personalMessage", async ({ sender, receiver, text }) => {
    if (!sender || !receiver || !text) return;

    const senderEmail = sender.toLowerCase().trim();
    const receiverEmail = receiver.toLowerCase().trim();

    try {
      const msg = await Message.create({
        sender: senderEmail,
        receiver: receiverEmail,
        text,
      });

      // Emit to receiver
      io.to(receiverEmail).emit("personalMessage", msg);
      // Echo back to sender
      io.to(senderEmail).emit("personalMessage", msg);

      console.log(`Message sent: ${senderEmail} -> ${receiverEmail}: ${text}`);
    } catch (err) {
      console.error("Error saving message:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find({}, "name email image");
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

app.get("/api/messages/:user1/:user2", async (req, res) => {
  const { user1, user2 } = req.params;
  try {
    const messages = await Message.find({
      $or: [
        { sender: user1.toLowerCase(), receiver: user2.toLowerCase() },
        { sender: user2.toLowerCase(), receiver: user1.toLowerCase() },
      ],
    }).sort({ timestamp: -1 }); // oldest first
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
