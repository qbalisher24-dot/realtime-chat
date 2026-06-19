"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/Avatar";
import type { Profile } from "@/lib/types";

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getProfile = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push("/auth/login");
        return;
      }
      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .single();
      if (prof) {
        setProfile(prof as Profile);
        setUsername(prof.username);
        setBio(prof.bio || "");
        setAvatarUrl(prof.avatar_url || "");
      }
      setLoading(false);
    };
    getProfile();
  }, [supabase, router]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    if (file.size > 500 * 1024) {
      setMessage("Xatolik: Rasm 500KB dan kichik bo'lishi kerak");
      return;
    }

    setUploading(true);
    setMessage("");

    try {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setAvatarUrl(base64);
        setUploading(false);
      };
      reader.onerror = () => {
        setMessage("Xatolik: Rasm o'qib bo'lmadi");
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setMessage("Xatolik: Rasm yuklashda xatolik");
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!profile || !username.trim()) return;
    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("profiles")
      .update({
        username: username.trim(),
        bio: bio.trim(),
        avatar_url: avatarUrl || null,
      })
      .eq("id", profile.id);

    if (error) {
      setMessage("Xatolik: " + error.message);
    } else {
      setMessage("Saqlandi!");
      setProfile({ ...profile, username: username.trim(), bio: bio.trim(), avatar_url: avatarUrl || null });
    }
    setSaving(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="glass-strong rounded-3xl px-8 py-6 flex items-center gap-3 animate-scale-in">
          <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <p className="text-white/60 font-medium">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6 animate-scale-in">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/chat")}
            className="w-10 h-10 rounded-2xl glass-btn-secondary flex items-center justify-center text-white/60 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-gradient">Sozlamalar</h1>
        </div>

        <div className="glass-strong rounded-3xl p-6 space-y-6">
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="relative group"
            >
              <Avatar name={username || "?"} src={avatarUrl} size="xl" />
              <div className="absolute inset-0 rounded-3xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                {uploading ? (
                  <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
            <p className="text-xs text-white/30">Rasmni o&apos;zgartirish uchun bosing (500KB gacha)</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-white/30 mb-1.5 block">Foydalanuvchi nomi</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 glass-input rounded-2xl text-white placeholder-white/30 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-white/30 mb-1.5 block">Haqida</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="O&apos;zingiz haqida..."
                rows={3}
                className="w-full px-4 py-3 glass-input rounded-2xl text-white placeholder-white/30 text-sm resize-none"
              />
            </div>
          </div>

          {message && (
            <p className={`text-sm text-center ${message.includes("Xatolik") ? "text-red-400" : "text-green-400"}`}>
              {message}
            </p>
          )}

          <button
            onClick={handleSave}
            disabled={saving || !username.trim()}
            className="w-full py-3 glass-btn rounded-2xl text-white font-semibold disabled:opacity-50"
          >
            {saving ? "Saqlanmoqda..." : "Saqlash"}
          </button>
        </div>

        <button
          onClick={handleLogout}
          className="w-full py-3 glass-strong rounded-2xl text-red-400 font-medium hover:bg-red-500/10 transition-colors"
        >
          Chiqish
        </button>
      </div>
    </div>
  );
}
