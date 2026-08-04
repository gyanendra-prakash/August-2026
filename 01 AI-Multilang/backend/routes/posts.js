import express from "express";
import { connectDB } from "../lib/mongodb.js";
import { Post } from "../models/Post.js";
import { translateToAllLocales } from "../lib/translateAll.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { title, body, locale } = req.body;

    if (!title || !body || !locale) {
      return res.status(400).json({ error: "title, body, aur locale zaroori hain" });
    }

    const translations = await translateToAllLocales(title, body, locale);

    await connectDB();
    const post = await Post.create({ translations, originalLocale: locale });

    res.json({ success: true, post });
  } catch (err) {
    console.error("Post creation error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/posts — saare posts fetch karo (blog listing ke liye)

router.get("/", async (req, res) => {
  try {
    await connectDB();
    const posts = await Post.find().sort({ createdAt: -1 }).lean();
    res.json({ posts });
  } catch (err) {
    console.error("Fetch posts error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/posts/:id — ek specific post uski ID se

router.get("/:id", async (req, res) => {
  try {
    await connectDB();
    const post = await Post.findById(req.params.id).lean();

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.json({ post });
  } catch (err) {
    console.error("Fetch single post error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
