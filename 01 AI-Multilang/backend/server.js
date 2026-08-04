import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import chatRoute from "./routes/chat.js";
import translateRoute from "./routes/translate.js";
import postsRoute from "./routes/posts.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
  })
);
app.use(express.json());

app.use("/api/chat", chatRoute);
app.use("/api/translate", translateRoute);
app.use("/api/posts", postsRoute);

app.get("/", (req, res) => {
  res.send("AI Multilang Backend is running.");
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
