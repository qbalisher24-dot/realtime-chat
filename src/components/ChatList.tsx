"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import Avatar from "./Avatar";
import type { ConversationWithDetails, Profile } from "@/lib/types";
import { formatTime, truncate } from "@/lib/utils";

interface ChatListProps {
  userId: string;
  selectedChatId?: string | null;
  onSelect: (conversationId: string) => void;
  refreshKey?: number;
}

export default function ChatList({ userId, selectedChatId, onSelect, refreshKey }: ChatListProps) {
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchConversations = async () => {
      const { data: memberships } = await supabase
        .from("conversation_members")
        .select("conversation_id, conversations(*)")
        .eq("user_id", userId);

      if (!memberships || memberships.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const convIds = memberships.map((m) => m.conversation_id);

      const { data: lastMessages } = await supabase
        .from("messages")
        .select("*")
        .in("conversation_id", convIds)
        .order("created_at", { ascending: false });

      const lastMsgMap = new Map<string, (typeof lastMessages extends (infer T)[] | null ? T : never)>();
      if (lastMessages) {
        const msgUserIds = [...new Set(lastMessages.map((m) => m.user_id))];
        const { data: msgProfiles } = await supabase
          .from("profiles")
          .select("id, username")
          .in("id", msgUserIds);
        const profileMap = new Map<string, { username: string }>();
        if (msgProfiles) {
          for (const p of msgProfiles) profileMap.set(p.id, { username: p.username });
        }
        for (const msg of lastMessages) {
          if (!lastMsgMap.has(msg.conversation_id)) {
            (msg as Record<string, unknown>).profiles = profileMap.get(msg.user_id) || null;
            lastMsgMap.set(msg.conversation_id, msg);
          }
        }
      }

      const convs: ConversationWithDetails[] = [];
      for (const membership of memberships) {
        const conv = membership.conversations as unknown as ConversationWithDetails;
        if (!conv) continue;

        conv.last_message = lastMsgMap.get(conv.id) || undefined;

        if (conv.type === "direct") {
          const { data: otherMember } = await supabase
            .from("conversation_members")
            .select("user_id")
            .eq("conversation_id", conv.id)
            .neq("user_id", userId)
            .single();

          if (otherMember) {
            const { data: otherProfile } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", otherMember.user_id)
              .single();
            if (otherProfile) conv.other_user = otherProfile as Profile;
          }
        }

        convs.push(conv);
      }

      convs.sort((a, b) => {
        const aTime = a.last_message?.created_at || a.created_at;
        const bTime = b.last_message?.created_at || b.created_at;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });

      setConversations(convs);
      setLoading(false);
    };

    fetchConversations();

    const channel = supabase
      .channel(`chat_list_updates:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        () => {
          fetchConversations();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversation_members",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase, refreshKey]);

  const getConvName = (conv: ConversationWithDetails): string => {
    if (conv.type === "direct" && conv.other_user) {
      return conv.other_user.username;
    }
    return conv.name || "Noma'lum";
  };

  const getConvSubtitle = (conv: ConversationWithDetails): string => {
    if (conv.last_message) {
      const sender = conv.last_message.profiles?.username || "Anonim";
      if (conv.type === "direct") {
        return truncate(conv.last_message.content, 40);
      }
      return `${sender}: ${truncate(conv.last_message.content, 30)}`;
    }
    return conv.description || "Xabarlar yo'q";
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 rounded-3xl glass-strong flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <p className="text-white/20 text-sm text-center">Hozircha suhbatlar yo&apos;q</p>
        <p className="text-white/10 text-xs text-center mt-1">Foydalanuvchi qidirib yozishingiz mumkin</p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto px-2 py-1 space-y-0.5">
      {conversations.map((conv) => {
        const isSelected = selectedChatId === conv.id;
        return (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={`w-full px-3 py-3 rounded-2xl flex items-center gap-3 transition-all duration-200 ${
              isSelected
                ? "bg-white/10 border border-white/10"
                : "hover:bg-white/5 border border-transparent"
            }`}
          >
            {conv.type === "direct" ? (
              <Avatar
                name={conv.other_user?.username || "?"}
                src={conv.other_user?.avatar_url}
                online={conv.other_user?.online}
              />
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500/60 to-purple-600/60 flex items-center justify-center text-white font-bold text-sm shrink-0">
                {conv.type === "channel" ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </div>
            )}
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-white truncate">{getConvName(conv)}</p>
                {conv.last_message && (
                  <span className="text-xs text-white/25 shrink-0 ml-2">
                    {formatTime(conv.last_message.created_at)}
                  </span>
                )}
              </div>
              <p className="text-xs text-white/30 truncate mt-0.5">{getConvSubtitle(conv)}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
