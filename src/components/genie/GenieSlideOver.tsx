"use client";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import * as Dialog from "@radix-ui/react-dialog";
import { Sparkle } from "@phosphor-icons/react";
import { useState } from "react";

export function GenieSlideOver({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const [input, setInput] = useState("");

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-forest-700/30" />
        <Dialog.Content className="fixed inset-y-0 right-0 w-full max-w-md bg-white p-4 shadow-xl">
          <Dialog.Title className="font-display text-lg flex items-center gap-2">
            <Sparkle weight="fill" /> TradeGenie
          </Dialog.Title>
          <Dialog.Description className="sr-only">
            Conversational procurement intelligence assistant
          </Dialog.Description>
          <div className="mt-4 flex h-[calc(100vh-160px)] flex-col">
            <div className="flex-1 overflow-auto space-y-2">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={
                    m.role === "user"
                      ? "rounded-lg p-2 text-sm bg-forest-100 ml-8"
                      : "rounded-lg p-2 text-sm bg-lime-300/30 mr-8"
                  }
                >
                  {m.parts.map((p, i) => (p.type === "text" ? <span key={i}>{p.text}</span> : null))}
                </div>
              ))}
              {status === "streaming" && (
                <div className="text-xs text-forest-500">Genie is thinking…</div>
              )}
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
                placeholder="Which vendors quoted me below market this month?"
              />
              <button className="rounded-lg bg-forest-700 px-3 py-2 text-sm text-white">Ask</button>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
