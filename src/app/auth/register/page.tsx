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

    console.log("Registering:", { email, username });

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
      },
    });

    console.log("SignUp result:", { data, error });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      console.log("User created:", data.user.id);
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: data.user.id,
        username,
        email,
      });
      console.log("Profile insert:", { error: profileError });
    }

    router.push("/chat");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-md p-8 bg-gray-900 rounded-2xl shadow-xl border border-gray-800">
        <h1 className="text-2xl font-bold text-center text-white mb-6">
          Ro&apos;yxatdan o&apos;tish
        </h1>
        <form onSubmit={handleRegister} className="space-y-4">
          <input
            type="text"
            placeholder="Foydalanuvchi nomi"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            required
          />
          <input
            type="password"
            placeholder="Parol (kamida 6 ta belgi)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            minLength={6}
            required
          />
          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
          >
            {loading ? "Kutilmoqda..." : "Ro&apos;yxatdan o&apos;tish"}
          </button>
        </form>
        <p className="text-center text-gray-400 mt-6">
          Hisobingiz bormi?{" "}
          <Link href="/auth/login" className="text-blue-400 hover:underline">
            Kirish
          </Link>
        </p>
      </div>
    </div>
  );
}
