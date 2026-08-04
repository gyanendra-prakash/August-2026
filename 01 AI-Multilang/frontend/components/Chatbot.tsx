"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { API_URL } from "@/lib/api";

export default function Chatbot() {
  const t = useTranslations("chatbot");
  const locale = useLocale();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ from: string; text: string }[]>(
    []
  );
  const [loading, setLoading] = useState(false);

  async function sendMessage() {
    if (!input.trim()) return;
    const userMsg = input;
    setMessages((prev) => [...prev, { from: "user", text: userMsg }]);
    setInput("");
    setLoading(true);

    const res = await fetch(`${API_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userMsg, locale }),
    });
    const data = await res.json();

    setMessages((prev) => [...prev, { from: "ai", text: data.reply }]);
    setLoading(false);
  }

  return (
    <div className="chat-box">
      <div className="chat-box-header">AI Assistant</div>
      <div className="chat-messages">
        {messages.map((m, i) => (
          <p key={i} className={`chat-msg ${m.from}`}>
            <span className="who">{m.from === "user" ? "You" : "AI"}:</span>
            {m.text}
          </p>
        ))}
        {loading && (
          <p className="chat-msg ai">
            <span className="who">AI:</span>
            <i>{t("thinking")}</i>
          </p>
        )}
      </div>
      <div className="chat-input-row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("placeholder")}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button onClick={sendMessage}>{t("send")}</button>
      </div>
    </div>
  );
}
