"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { API_URL } from "@/lib/api";

type PostTranslation = { title: string; body: string };
type Post = {
  _id: string;
  translations: Record<string, PostTranslation>;
  originalLocale: string;
};

export default function BlogPage() {
  const locale = useLocale();
  const t = useTranslations("blog");
  const tNav = useTranslations("nav");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/posts`)
      .then((res) => res.json())
      .then((data) => {
        setPosts(data.posts || []);
        setLoading(false);
      });
  }, [locale]);

  return (
    <div className="shell">
      <nav className="topnav">
        <a href={`/${locale}`} className="brand">
          AI Site
        </a>
        <div className="links">
          <a href={`/${locale}`}>{tNav("home")}</a>
          <a href={`/${locale}/blog`} className="active">
            {tNav("blog")}
          </a>
          <a href={`/${locale}/admin`}>Admin</a>
        </div>
        <LanguageSwitcher />
      </nav>

      <span className="section-label">{t("latest_heading")}</span>
      <h1 style={{ fontSize: "2rem", marginBottom: "1.5rem" }}>
        {tNav("blog")}
      </h1>

      {loading && <p style={{ color: "var(--ink-soft)" }}>...</p>}

      {!loading && posts.length === 0 && (
        <div className="empty-state">{t("empty_message")}</div>
      )}

      <div className="blog-grid">
        {posts.map((post) => {
          const content =
            post.translations[locale] || post.translations[post.originalLocale];
          const langCount = Object.keys(post.translations).length;

          return (
            <a
              key={post._id}
              href={`/${locale}/blog/${post._id}`}
              className="blog-card"
            >
              <h3>{content.title}</h3>
              <p>{content.body}</p>
              <div className="blog-card-footer">
                <span className="langs-label">{t("translated_label")}</span>
                <div className="lang-dots">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <span
                      key={i}
                      className={`dot ${i < langCount ? "filled" : ""}`}
                    />
                  ))}
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
