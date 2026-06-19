"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useRef } from "react";
import Avatar from "./Avatar";
import type { Profile } from "@/lib/types";

interface SidebarProps {
  onOpenChat?: (conversationId: string) => void;
  onCreateGroup?: () => void;
  onCreateChannel?: () => void;
}

export default function Sidebar({ onOpenChat, onCreateGroup, onCreateChannel }: SidebarProps) {
  const [user, setUser] = useState<Profile | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [dmLoading, setDmLoading] = useState<string | null>(null);
  const [dmError, setDmError] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .single();
      if (profile) setUser(profile as Profile);
    };
    getUser();
  }, [supabase]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      const timer = setTimeout(() => {
        setSearchResults([]);
        setSearching(false);
      }, 0);
      return () => clearTimeout(timer);
    }
    const timeout = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .neq("id", user?.id || "")
        .ilike("username", `%${searchQuery}%`)
        .limit(20);
      setSearchResults((data as Profile[]) || []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, supabase, user?.id]);

  const startDirectMessage = async (otherUserId: string) => {
    if (!user) return;
    setDmLoading(otherUserId);
    setDmError("");

    const { data: existing } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", user.id);

    if (existing) {
      for (const member of existing) {
        const { data: otherMember } = await supabase
          .from("conversation_members")
          .select("conversation_id")
          .eq("conversation_id", member.conversation_id)
          .eq("user_id", otherUserId)
          .single();

        if (otherMember) {
          setShowSearch(false);
          setSearchQuery("");
          setDmLoading(null);
          onOpenChat?.(member.conversation_id);
          return;
        }
      }
    }

    const { data: conv, error: convErr } = await supabase
      .from("conversations")
      .insert({ type: "direct", created_by: user.id })
      .select()
      .single();

    if (convErr || !conv) {
      setDmError("Suhbat yaratishda xatolik" + (convErr ? ": " + convErr.message : ""));
      setDmLoading(null);
      return;
    }

    const { error: memberErr } = await supabase.from("conversation_members").insert([
      { conversation_id: conv.id, user_id: user.id, role: "admin" },
      { conversation_id: conv.id, user_id: otherUserId, role: "member" },
    ]);

    if (memberErr) {
      setDmError("A'zo qo'shishda xatolik: " + memberErr.message);
      setDmLoading(null);
      return;
    }

    setShowSearch(false);
    setSearchQuery("");
    setDmLoading(null);
    onOpenChat?.(conv.id);
  };

  return (
    <div className="px-4 pt-4 pb-2 space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gradient">Chat</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="w-9 h-9 rounded-xl glass-btn-secondary flex items-center justify-center text-white/60 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-9 h-9 rounded-xl glass-btn-secondary flex items-center justify-center text-white/60 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 glass-strong rounded-2xl py-2 z-50 animate-scale-in shadow-xl shadow-black/30">
                <button
                  onClick={() => { onCreateGroup?.(); setShowMenu(false); }}
                  className="w-full px-4 py-3 text-left text-sm text-white/80 hover:bg-white/5 flex items-center gap-3 transition-colors"
                >
                  <svg className="w-5 h-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Guruh yaratish
                </button>
                <button
                  onClick={() => { onCreateChannel?.(); setShowMenu(false); }}
                  className="w-full px-4 py-3 text-left text-sm text-white/80 hover:bg-white/5 flex items-center gap-3 transition-colors"
                >
                  <svg className="w-5 h-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                  </svg>
                  Kanal yaratish
                </button>
                <div className="border-t border-white/5 my-1" />
                <button
                  onClick={() => { window.location.href = "/settings"; }}
                  className="w-full px-4 py-3 text-left text-sm text-white/80 hover:bg-white/5 flex items-center gap-3 transition-colors"
                >
                  <svg className="w-5 h-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Sozlamalar
                </button>
                <div className="border-t border-white/5 my-1" />
                <div className="px-4 py-3 text-sm text-white/30">
                  {user?.email}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showSearch && (
        <div className="animate-fade-in">
          <input
            type="text"
            placeholder="Foydalanuvchi qidirish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 glass-input rounded-2xl text-white placeholder-white/30 text-sm"
            autoFocus
          />
        </div>
      )}

      {dmError && (
        <div className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20">
          <p className="text-red-400 text-xs">{dmError}</p>
        </div>
      )}

      {showSearch && (
        <div className="max-h-64 overflow-y-auto space-y-0.5">
          {searching && (
            <div className="flex justify-center py-6">
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}
          {!searching && searchResults.length === 0 && searchQuery.trim() && (
            <p className="text-center text-white/20 text-sm py-6">Hech narsa topilmadi</p>
          )}
          {searchResults.map((profile) => (
            <button
              key={profile.id}
              onClick={() => startDirectMessage(profile.id)}
              disabled={dmLoading !== null}
              className="w-full px-3 py-2.5 rounded-xl hover:bg-white/5 flex items-center gap-3 transition-colors disabled:opacity-50"
            >
              {dmLoading === profile.id ? (
                <span className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </span>
              ) : (
                <Avatar name={profile.username} src={profile.avatar_url} size="sm" />
              )}
              <div className="text-left">
                <p className="text-sm font-medium text-white">{profile.username}</p>
                <p className="text-xs text-white/30">{profile.email}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {user && !showSearch && (
        <button
          onClick={() => window.location.href = "/settings"}
          className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors"
        >
          <Avatar name={user.username} src={user.avatar_url} size="md" online={true} />
          <div className="text-left flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user.username}</p>
            <p className="text-xs text-green-400">Online</p>
          </div>
          <svg className="w-4 h-4 text-white/15 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  );
}
