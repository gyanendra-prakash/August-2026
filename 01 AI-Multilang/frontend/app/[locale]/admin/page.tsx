"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { API_URL } from "@/lib/api";


export default function AdminPage() {
  const locale = useLocale();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [newPostId, setNewPostId] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setNewPostId(null);

    try {
      const res = await fetch(`${API_URL}/api/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, locale }),
      });

      const data = await res.json();

      if (data.success) {
        setIsError(false);
        setMessage(
          `Published — auto-translated into ${Object.keys(data.post.translations).length} languages.`
        );
        setNewPostId(data.post._id);
        setTitle("");
        setBody("");
      } else {
        setIsError(true);
        setMessage(`Error: ${data.error}`);
      }
    } catch (err) {
      setIsError(true);
      setMessage("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="shell">
      <nav className="topnav">
        <a href={`/${locale}`} className="brand">
          AI Site
        </a>
        <div className="links">
          <a href={`/${locale}`}>Home</a>
          <a href={`/${locale}/blog`}>Blog</a>
          <a href={`/${locale}/admin`} className="active">
            Admin
          </a>
        </div>
        <LanguageSwitcher />
      </nav>

      <span className="section-label">Admin</span>
      <h1 style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>
        Publish a new post
      </h1>
      <p style={{ color: "var(--ink-soft)", marginBottom: "1.5rem" }}>
        Write in any language — it will auto-translate into all 8 supported
        languages when published.
      </p>

      <div className="admin-card">
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g. New Product Launch"
            />
          </div>

          <div className="field">
            <label>Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              rows={6}
              placeholder="Write the full content here..."
            />
          </div>

          <button type="submit" className="btn" disabled={loading}>
            {loading ? "Translating..." : "Publish"}
          </button>
        </form>

        {message && (
          <div className={`status-msg ${isError ? "error" : ""}`}>
            {message}
            {newPostId && (
              <>
                {" — "}
                <a href={`/${locale}/blog/${newPostId}`}>View post →</a>
              </>
            )}
          </div>
        )}
      </div>

      <p style={{ marginTop: "1.5rem" }}>
        <a href={`/${locale}/blog`} className="back-link">
          → View all posts
        </a>
      </p>
    </div>
  );
}
