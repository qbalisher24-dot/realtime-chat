"use client";

import { createClient } from "@/lib/supabase/client";
import { useState, useEffect } from "react";
import Avatar from "./Avatar";
import type { Profile } from "@/lib/types";

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (conversationId: string) => void;
  type: "group" | "channel";
  userId: string;
}

export default function CreateGroupModal({ isOpen, onClose, onCreate, type, userId }: CreateGroupModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  useEffect(() => {
    if (!searchQuery.trim()) {
      const timer = setTimeout(() => setSearchResults([]), 0);
      return () => clearTimeout(timer);
    }
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .neq("id", userId)
        .ilike("username", `%${searchQuery}%`)
        .limit(20);
      setSearchResults((data as Profile[]) || []);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, supabase, userId]);

  const toggleUser = (profile: Profile) => {
    setSelectedUsers((prev) =>
      prev.some((u) => u.id === profile.id)
        ? prev.filter((u) => u.id !== profile.id)
        : [...prev, profile]
    );
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError("");

    const { data: conv, error: convError } = await supabase
      .from("conversations")
      .insert({
        type,
        name: name.trim(),
        description: description.trim(),
        created_by: userId,
      })
      .select()
      .single();

    if (convError) {
      setError("Suhbat yaratishda xatolik: " + convError.message);
      setLoading(false);
      return;
    }

    if (conv) {
      const members = [
        { conversation_id: conv.id, user_id: userId, role: "admin" },
        ...selectedUsers.map((u) => ({
          conversation_id: conv.id,
          user_id: u.id,
          role: "member" as const,
        })),
      ];
      const { error: memberError } = await supabase.from("conversation_members").insert(members);
      if (memberError) {
        setError("A'zo qo'shishda xatolik: " + memberError.message);
        setLoading(false);
        return;
      }
      onCreate(conv.id);
    }

    setName("");
    setDescription("");
    setSelectedUsers([]);
    setSearchQuery("");
    setLoading(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md glass-strong rounded-3xl p-6 space-y-5 animate-scale-in max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            {type === "group" ? "Guruh yaratish" : "Kanal yaratish"}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl glass-btn-secondary flex items-center justify-center text-white/40 hover:text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <input
          type="text"
          placeholder={type === "group" ? "Guruh nomi" : "Kanal nomi"}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-3 glass-input rounded-2xl text-white placeholder-white/30 text-sm"
        />

        <input
          type="text"
          placeholder="Tavsif (ixtiyoriy)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-4 py-3 glass-input rounded-2xl text-white placeholder-white/30 text-sm"
        />

        {type === "group" && (
          <>
            <input
              type="text"
              placeholder="Foydalanuvchi qidirish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 glass-input rounded-2xl text-white placeholder-white/30 text-sm"
            />

            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((u) => (
                  <span key={u.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 glass rounded-full text-xs text-white/80">
                    {u.username}
                    <button onClick={() => toggleUser(u)} className="text-white/40 hover:text-white">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {searchResults.map((profile) => {
                  const isSelected = selectedUsers.some((u) => u.id === profile.id);
                  return (
                    <button
                      key={profile.id}
                      onClick={() => toggleUser(profile)}
                      className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-3 transition-colors ${
                        isSelected ? "bg-indigo-500/20 border border-indigo-500/30" : "hover:bg-white/5 border border-transparent"
                      }`}
                    >
                      <Avatar name={profile.username} src={profile.avatar_url} size="sm" />
                      <span className="text-sm text-white">{profile.username}</span>
                      {isSelected && (
                        <svg className="w-4 h-4 text-indigo-400 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {error && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}

        <button
          onClick={handleCreate}
          disabled={!name.trim() || loading}
          className="w-full py-3 glass-btn rounded-2xl text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Yaratilmoqda..." : "Yaratish"}
        </button>
      </div>
    </div>
  );
}
