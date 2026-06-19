"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface Message {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  profiles: { username: string } | null;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push("/auth/login");
        return;
      }
      setUser(data.user);
      setLoading(false);
    };
    getUser();
  }, [supabase, router]);

  useEffect(() => {
    if (!user) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*, profiles(username)")
        .order("created_at", { ascending: true })
        .limit(100);

      if (data) setMessages(data as Message[]);
    };

    fetchMessages();

    const channel = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const { data } = await supabase
            .from("messages")
            .select("*, profiles(username)")
            .eq("id", payload.new.id)
            .single();

          if (data) {
            setMessages((prev) => [...prev, data as Message]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const { error } = await supabase.from("messages").insert({
      content: newMessage.trim(),
      user_id: user.id,
    });

    if (!error) {
      setNewMessage("");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-strong rounded-3xl px-8 py-6 flex items-center gap-3 animate-scale-in">
          <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <p className="text-white/60 font-medium">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="glass-strong rounded-b-3xl mx-4 mt-4 px-6 py-4 flex items-center justify-between animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-500/30">
            C
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Chat</h1>
            <p className="text-xs text-white/40">Real-time</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-white/30 text-sm hidden sm:block">{user?.email}</span>
          <button
            onClick={handleLogout}
            className="glass-btn-secondary px-5 py-2.5 rounded-2xl text-white/70 text-sm font-medium hover:text-white"
          >
            Chiqish
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4 animate-fade-in">
            <div className="w-20 h-20 rounded-3xl glass-strong flex items-center justify-center">
              <svg className="w-10 h-10 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-white/20 text-lg font-medium">Hozircha xabarlar yo&apos;q</p>
            <p className="text-white/10 text-sm">Birinchi bo&apos;lib yozing!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.user_id === user?.id;
            return (
              <div
                key={msg.id}
                className={`flex ${isOwn ? "justify-end" : "justify-start"} ${isOwn ? "animate-slide-right" : "animate-slide-left"}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-5 py-3.5 rounded-3xl ${
                    isOwn
                      ? "bg-gradient-to-br from-indigo-500/80 to-purple-600/80 text-white shadow-lg shadow-indigo-500/20"
                      : "glass-strong text-white"
                  }`}
                >
                  {!isOwn && (
                    <p className="text-xs text-indigo-300/80 mb-1.5 font-medium">
                      {msg.profiles?.username || "Anonim"}
                    </p>
                  )}
                  <p className="break-words leading-relaxed">{msg.content}</p>
                  <p
                    className={`text-xs mt-1.5 ${
                      isOwn ? "text-white/40" : "text-white/25"
                    }`}
                  >
                    {new Date(msg.created_at).toLocaleTimeString("uz-UZ", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </main>

      <form
        onSubmit={sendMessage}
        className="glass-strong rounded-t-3xl mx-4 mb-4 p-4 animate-fade-in-up delay-200 opacity-0"
      >
        <div className="flex gap-3 items-center">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Xabar yozing..."
            className="flex-1 px-5 py-3.5 glass-input rounded-2xl text-white placeholder-white/30 text-base"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="glass-btn px-6 py-3.5 rounded-2xl text-white font-semibold disabled:opacity-30 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            <span className="hidden sm:inline">Yuborish</span>
          </button>
        </div>
      </form>
    </div>
  );
}
