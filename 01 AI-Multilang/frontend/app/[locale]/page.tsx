"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Chatbot from "@/components/Chatbot";
import { API_URL } from "@/lib/api";

type PostTranslation = { title: string; body: string };
type Post = {
  _id: string;
  translations: Record<string, PostTranslation>;
  originalLocale: string;
};

export default function HomePage() {
  const t = useTranslations("home");
  const tNav = useTranslations("nav");
  const tBlog = useTranslations("blog");
  const locale = useLocale();

  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    fetch(`${API_URL}/api/posts`)
      .then((res) => res.json())
      .then((data) => setPosts((data.posts || []).slice(0, 3)));
  }, [locale]);

  return (
    <div className="shell">
      <nav className="topnav">
        <a href={`/${locale}`} className="brand">
          AI Site
        </a>
        <div className="links">
          <a href={`/${locale}`} className="active">
            {tNav("home")}
          </a>
          <a href={`/${locale}/blog`}>{tNav("blog")}</a>
          <a href={`/${locale}/admin`}>Admin</a>
        </div>
        <LanguageSwitcher />
      </nav>

      <section className="hero">
        <h1>{t("title")}</h1>
        <p>{t("subtitle")}</p>
        <a href="#chat" className="btn">
          {t("cta_button")}
        </a>
      </section>

      {posts.length > 0 && (
        <section style={{ marginTop: "1rem" }}>
          <span className="section-label">{tBlog("latest_heading")}</span>
          <div className="blog-grid" style={{ marginBottom: "2.5rem" }}>
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
                    <span className="langs-label">{tBlog("translated_label")}</span>
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
        </section>
      )}

      <div id="chat">
        <Chatbot />
      </div>
    </div>
  );
}
