"use client";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState } from "react";

export default function Ask() {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const [input, setInput] = useState("");

  return (
    <div className="mx-auto flex h-[calc(100vh-100px)] max-w-3xl flex-col">
      <h1 className="font-display text-3xl mb-3">Ask Genie</h1>
      <div className="flex-1 overflow-auto space-y-2">
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              m.role === "user"
                ? "rounded-lg p-3 text-sm bg-forest-100 ml-12"
                : "rounded-lg p-3 text-sm bg-lime-300/30 mr-12"
            }
          >
            {m.parts.map((p, i) => (p.type === "text" ? <span key={i}>{p.text}</span> : null))}
          </div>
        ))}
        {status === "streaming" && <div className="text-xs text-forest-500">Genie is thinking…</div>}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim()) {
            sendMessage({ text: input });
            setInput("");
          }
        }}
        className="mt-3 flex gap-2"
      >
        <input
          className="flex-1 rounded-lg border border-forest-100/60 px-3 py-2 text-sm"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about your vendors…"
        />
        <button className="rounded-lg bg-forest-700 px-4 py-2 text-sm text-white">Ask</button>
      </form>
    </div>
  );
}
