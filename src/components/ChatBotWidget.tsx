"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';

type Message = {
  role: "user" | "model";
  content: string;
};

export function ChatBotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "model", content: "Hi! I am your course management assistant. How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: messages,
          message: userMsg
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessages((prev) => [...prev, { role: "model", content: data.reply }]);
      } else {
        setMessages((prev) => [...prev, { role: "model", content: data.reply || "Failed to fetch response." }]);
      }
    } catch (err) {
      setMessages((prev) => [...prev, { role: "model", content: "An error occurred connecting to the server." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chat Window */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-[400px] max-w-[calc(100vw-3rem)] h-[550px] bg-background border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="bg-primary p-4 flex items-center justify-between text-primary-foreground">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              <h3 className="font-semibold text-[15px]">Course Assistant</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-primary-foreground/80 hover:text-primary-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/20">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex items-start gap-2 max-w-[85%]",
                  msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                    msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground border"
                  )}
                >
                  {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div
                  className={cn(
                    "p-3 rounded-2xl text-sm leading-relaxed",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-background border shadow-sm rounded-tl-sm"
                  )}
                >
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start gap-2 mr-auto max-w-[85%]">
                <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground border flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="p-3 rounded-2xl text-sm leading-relaxed bg-background border shadow-sm rounded-tl-sm flex items-center gap-1 h-10">
                  <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <form onSubmit={sendMessage} className="p-3 bg-background border-t">
            <div className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message..."
                disabled={isLoading}
                className="w-full pl-4 pr-12 py-3 bg-muted/50 border-none rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-[15px]"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-1.5 w-9 h-9 flex items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-300",
          isOpen && "rotate-90 scale-0 opacity-0"
        )}
      >
        <MessageSquare className="w-6 h-6" />
      </button>
    </div>
  );
}
