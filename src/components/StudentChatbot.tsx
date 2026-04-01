"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Database, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function StudentChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', text: string, data?: any}[]>([
    { role: 'assistant', text: "Hi! I'm your Student DB Assistant. Ask me questions about your courses, grades, or schedule!" }
  ]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim() || loading) return;

    const userMsg = query.trim();
    setQuery("");
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch("/api/student/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userMsg })
      });

      const json = await res.json();

      if (!res.ok) {
        setMessages(prev => [...prev, { role: 'assistant', text: "Sorry, I ran into an error: " + (json.error || "Unknown error") }]);
      } else {
        setMessages(prev => [...prev, { 
            role: 'assistant', 
            text: json.response || "Here are your results:",
            data: json.data 
        }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: "Network error trying to reach the assistant." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[99] flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div className="mb-4 w-[350px] sm:w-[400px] h-[500px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="bg-primary p-4 flex items-center justify-between text-primary-foreground">
            <div className="flex items-center gap-2 font-semibold">
              <Database className="w-4 h-4" />
              SQL DB Assistant
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-primary/20 p-1 rounded-full transition">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
            {messages.map((msg, i) => (
              <div key={i} className={cn("flex flex-col", msg.role === 'user' ? "items-end" : "items-start")}>
                <div className={cn(
                  "px-4 py-2 rounded-2xl max-w-[85%] text-sm",
                  msg.role === 'user' ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted text-foreground border border-border rounded-tl-sm"
                )}>
                  {msg.text}
                </div>
                {msg.data && msg.data.length > 0 && (
                  <div className="mt-2 bg-secondary/50 rounded-xl border border-border p-2 w-full max-w-[90%] overflow-x-auto text-[10px] sm:text-xs">
                    <pre className="m-0 text-muted-foreground">{JSON.stringify(msg.data, null, 2)}</pre>
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-start">
                <div className="bg-muted px-4 py-3 rounded-2xl rounded-tl-sm border border-border flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground font-medium">Querying database...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-3 bg-secondary/30 border-t border-border">
            <form onSubmit={handleSend} className="flex gap-2 relative">
              <input
                type="text"
                placeholder="Ask about your courses..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                autoFocus
                className="flex-1 bg-card border border-input rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button 
                type="submit" 
                disabled={loading || !query.trim()}
                className="bg-primary text-primary-foreground p-2 rounded-xl hover:bg-primary/90 disabled:opacity-50 transition"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95",
          isOpen ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground"
        )}
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>
    </div>
  );
}
