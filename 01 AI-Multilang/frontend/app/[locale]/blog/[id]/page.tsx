"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { API_URL } from "@/lib/api";

type PostTranslation = { title: string; body: string };
type Post = {
  _id: string;
  translations: Record<string, PostTranslation>;
  originalLocale: string;
};

export default function BlogDetailPage() {
  const locale = useLocale();
  const t = useTranslations("blog");
  const tNav = useTranslations("nav");
  const params = useParams();
  const id = params.id as string;

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  // Jab bhi locale badlega (dropdown se), ye effect dobara nahi chalega
  // kyunki post data pehle se database mein saari languages ke saath hai -
  // sirf displayed content (neeche) locale ke hisaab se switch hoga

  useEffect(() => {
    fetch(`${API_URL}/api/posts/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setPost(data.post || null);
        setLoading(false);
      });
  }, [id, locale]);

  const content =
    post && (post.translations[locale] || post.translations[post.originalLocale]);

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

      <a href={`/${locale}/blog`} className="back-link">
        ← {t("back_link")}
      </a>

      {loading && <p style={{ color: "var(--ink-soft)" }}>...</p>}

      {!loading && !post && <div className="empty-state">Post not found.</div>}

      {content && (
        <article>
          <div className="article-header">
            <h1>{content.title}</h1>
            <span className="langs-label mono">{t("translated_label")}</span>
          </div>
          <p className="article-body">{content.body}</p>
        </article>
      )}
    </div>
  );
}
