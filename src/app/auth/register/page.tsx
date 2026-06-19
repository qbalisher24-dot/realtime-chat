"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: data.user.id,
        username,
        email,
      });
    }

    router.push("/chat");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8 animate-scale-in">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gradient tracking-tight">
            Ro&apos;yxatdan o&apos;tish
          </h1>
          <p className="text-white/40">Yangi hisob yarating</p>
        </div>

        <form onSubmit={handleRegister} className="glass-strong rounded-3xl p-8 space-y-5">
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Foydalanuvchi nomi"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-5 py-4 glass-input rounded-2xl text-white placeholder-white/30 text-base"
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-5 py-4 glass-input rounded-2xl text-white placeholder-white/30 text-base"
              required
            />
            <input
              type="password"
              placeholder="Parol (kamida 6 ta belgi)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-4 glass-input rounded-2xl text-white placeholder-white/30 text-base"
              minLength={6}
              required
            />
          </div>

          {error && (
            <div className="glass rounded-2xl px-4 py-3 border-red-500/30 bg-red-500/10">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 glass-btn rounded-2xl text-white font-semibold text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Kutilmoqda...
              </span>
            ) : (
              "Ro&apos;yxatdan o&apos;tish"
            )}
          </button>
        </form>

        <p className="text-center text-white/30 text-sm">
          Hisobingiz bormi?{" "}
          <Link
            href="/auth/login"
            className="text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
          >
            Kirish
          </Link>
        </p>
      </div>
    </div>
  );
}
