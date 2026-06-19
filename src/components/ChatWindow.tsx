"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useRef } from "react";
import Avatar from "./Avatar";
import type { Message, Conversation, Profile, ConversationMember } from "@/lib/types";
import { formatMessageTime } from "@/lib/utils";

interface ChatWindowProps {
  conversationId: string;
  userId: string;
  onBack?: () => void;
}

export default function ChatWindow({ conversationId, userId, onBack }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [members, setMembers] = useState<ConversationMember[]>([]);
  const [showMembers, setShowMembers] = useState(false);
  const [sendError, setSendError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const enrichMessages = async (rawMessages: Message[]): Promise<Message[]> => {
    const userIds = [...new Set(rawMessages.map((m) => m.user_id))];
    if (userIds.length === 0) return rawMessages;

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .in("id", userIds);

    const profileMap = new Map<string, Profile>();
    if (profiles) {
      for (const p of profiles) {
        profileMap.set(p.id, p as Profile);
      }
    }

    return rawMessages.map((m) => ({
      ...m,
      profiles: profileMap.get(m.user_id) || null,
    }));
  };

  useEffect(() => {
    const loadConversation = async () => {
      const { data: conv } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", conversationId)
        .single();

      if (conv) {
        setConversation(conv as Conversation);

        if (conv.type === "direct") {
          const { data: member } = await supabase
            .from("conversation_members")
            .select("user_id")
            .eq("conversation_id", conversationId)
            .neq("user_id", userId)
            .single();

          if (member) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", member.user_id)
              .single();
            if (profile) setOtherUser(profile as Profile);
          }
        } else {
          const { data: memberList } = await supabase
            .from("conversation_members")
            .select("user_id, role, id, conversation_id, muted, pinned, last_read_at, joined_at")
            .eq("conversation_id", conversationId);

          if (memberList) {
            const memberUserIds = memberList.map((m) => m.user_id);
            const { data: memberProfiles } = await supabase
              .from("profiles")
              .select("*")
              .in("id", memberUserIds);

            const profileMap = new Map<string, Profile>();
            if (memberProfiles) {
              for (const p of memberProfiles) {
                profileMap.set(p.id, p as Profile);
              }
            }

            const enrichedMembers = memberList.map((m) => ({
              ...m,
              profiles: profileMap.get(m.user_id) || null,
            })) as ConversationMember[];

            setMembers(enrichedMembers);
          }
        }
      }
    };

    loadConversation();
  }, [conversationId, supabase, userId]);

  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(200);

      if (data) {
        const enriched = await enrichMessages(data as Message[]);
        setMessages(enriched);
      }
    };

    fetchMessages();

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from("messages")
            .select("*")
            .eq("id", payload.new.id)
            .single();

          if (data) {
            const enriched = await enrichMessages([data as Message]);
            setMessages((prev) => {
              if (prev.some((m) => m.id === enriched[0].id)) return prev;
              return [...prev, enriched[0]];
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, supabase]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setSendError("");

    const content = newMessage.trim();
    setNewMessage("");

    const { data, error } = await supabase
      .from("messages")
      .insert({
        content,
        user_id: userId,
        conversation_id: conversationId,
      })
      .select("*")
      .single();

    if (error) {
      setSendError("Xabar yuborishda xatolik: " + error.message);
      setNewMessage(content);
    } else if (data) {
      const enriched = await enrichMessages([data as Message]);
      setMessages((prev) => {
        if (prev.some((m) => m.id === enriched[0].id)) return prev;
        return [...prev, enriched[0]];
      });
    }
  };

  const deleteMessage = async (messageId: string) => {
    await supabase.from("messages").delete().eq("id", messageId);
  };

  const getHeaderInfo = () => {
    if (conversation?.type === "direct" && otherUser) {
      return {
        name: otherUser.username,
        subtitle: otherUser.online ? "Online" : "Offline",
        online: otherUser.online,
        src: otherUser.avatar_url,
      };
    }
    return {
      name: conversation?.name || "Noma'lum",
      subtitle: `${members.length + 1} a'zo`,
      online: undefined,
      src: conversation?.avatar_url,
    };
  };

  const header = getHeaderInfo();

  return (
    <div className="h-full flex flex-col">
      <div className="glass-strong rounded-b-3xl px-4 py-3 flex items-center gap-3 animate-fade-in-up">
        {onBack && (
          <button onClick={onBack} className="w-9 h-9 rounded-xl glass-btn-secondary flex items-center justify-center text-white/60 hover:text-white sm:hidden">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <Avatar name={header.name} src={header.src} online={header.online} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{header.name}</p>
          <p className={`text-xs ${header.online === true ? "text-green-400" : "text-white/30"}`}>
            {header.subtitle}
          </p>
        </div>
        {conversation?.type !== "direct" && (
          <button
            onClick={() => setShowMembers(!showMembers)}
            className="w-9 h-9 rounded-xl glass-btn-secondary flex items-center justify-center text-white/60 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </button>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4 animate-fade-in">
              <div className="w-20 h-20 rounded-3xl glass-strong flex items-center justify-center">
                <svg className="w-10 h-10 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-white/20 text-sm">Xabar yozing...</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isOwn = msg.user_id === userId;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isOwn ? "justify-end" : "justify-start"} ${isOwn ? "animate-slide-right" : "animate-slide-left"}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-3 rounded-3xl group relative ${
                      isOwn
                        ? "bg-gradient-to-br from-indigo-500/80 to-purple-600/80 text-white shadow-lg shadow-indigo-500/20"
                        : "glass-strong text-white"
                    }`}
                  >
                    {!isOwn && conversation?.type !== "direct" && (
                      <p className="text-xs text-indigo-300/80 mb-1 font-medium">
                        {msg.profiles?.username || "Anonim"}
                      </p>
                    )}
                    <p className="break-words leading-relaxed text-sm">{msg.content}</p>
                    <div className="flex items-center justify-end gap-2 mt-1">
                      <p className={`text-xs ${isOwn ? "text-white/40" : "text-white/25"}`}>
                        {formatMessageTime(msg.created_at)}
                      </p>
                      {isOwn && (
                        <button
                          onClick={() => deleteMessage(msg.id)}
                          className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition-all"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {showMembers && conversation?.type !== "direct" && (
          <div className="w-64 border-l border-white/5 glass-strong animate-fade-in overflow-y-auto">
            <div className="p-4 space-y-3">
              <p className="text-xs text-white/30 font-medium uppercase tracking-wider">A&apos;zolar ({members.length + 1})</p>
              {members.map((member) => (
                <div key={member.id} className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors">
                  <Avatar
                    name={member.profiles?.username || "?"}
                    src={member.profiles?.avatar_url}
                    size="sm"
                    online={member.profiles?.online}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white truncate">
                      {member.profiles?.username}
                      {member.user_id === userId && <span className="text-white/30 ml-1">(siz)</span>}
                    </p>
                    {member.role === "admin" && (
                      <p className="text-xs text-indigo-400/60">Admin</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {sendError && (
        <div className="mx-4 mb-2 px-4 py-2 rounded-2xl bg-red-500/10 border border-red-500/20">
          <p className="text-red-400 text-xs text-center">{sendError}</p>
        </div>
      )}

      <form
        onSubmit={sendMessage}
        className="glass-strong rounded-t-3xl mx-4 mb-4 p-3 animate-fade-in-up delay-200 opacity-0"
      >
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Xabar yozing..."
            className="flex-1 px-4 py-3 glass-input rounded-2xl text-white placeholder-white/30 text-sm"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="glass-btn w-11 h-11 rounded-2xl flex items-center justify-center text-white disabled:opacity-30 disabled:cursor-not-allowed disabled:transform-none shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
