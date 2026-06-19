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
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <p className="text-white">Yuklanmoqda...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-950">
      <header className="flex items-center justify-between px-6 py-4 bg-gray-900 border-b border-gray-800">
        <h1 className="text-xl font-bold text-white">Chat</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-400 text-sm">{user?.email}</span>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors"
          >
            Chiqish
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <p className="text-center text-gray-500 mt-20">
            Hozircha xabarlar yo&apos;q. Birinchi bo&apos;lib yozing!
          </p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.user_id === user?.id ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                  msg.user_id === user?.id
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-white"
                }`}
              >
                {msg.user_id !== user?.id && (
                  <p className="text-xs text-blue-400 mb-1">
                    {msg.profiles?.username || "Anonim"}
                  </p>
                )}
                <p className="break-words">{msg.content}</p>
                <p
                  className={`text-xs mt-1 ${
                    msg.user_id === user?.id
                      ? "text-blue-200"
                      : "text-gray-500"
                  }`}
                >
                  {new Date(msg.created_at).toLocaleTimeString("uz-UZ", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </main>

      <form
        onSubmit={sendMessage}
        className="p-4 bg-gray-900 border-t border-gray-800"
      >
        <div className="flex gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Xabar yozing..."
            className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
          >
            Yuborish
          </button>
        </div>
      </form>
    </div>
  );
}
