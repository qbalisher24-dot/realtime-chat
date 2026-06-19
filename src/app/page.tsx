import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function HomePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (data.user) {
    redirect("/chat");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center space-y-8 animate-fade-in-up">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 glass rounded-full text-sm text-white/60 animate-fade-in-up delay-100 opacity-0">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Real-time
          </div>
          <h1 className="text-6xl sm:text-7xl font-bold text-gradient tracking-tight animate-fade-in-up delay-200 opacity-0">
            Realtime
            <br />
            <span className="text-gradient-accent">Chat</span>
          </h1>
          <p className="text-white/40 text-lg max-w-md mx-auto leading-relaxed animate-fade-in-up delay-300 opacity-0">
            Soddalik bilan yaratilgan real-time chat ilovasi.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up delay-400 opacity-0">
          <Link
            href="/auth/login"
            className="glass-btn px-8 py-4 rounded-2xl text-white font-semibold text-base tracking-wide"
          >
            Kirish
          </Link>
          <Link
            href="/auth/register"
            className="glass-btn-secondary px-8 py-4 rounded-2xl text-white/80 font-semibold text-base tracking-wide"
          >
            Ro&apos;yxatdan o&apos;tish
          </Link>
        </div>

        <div className="flex items-center justify-center gap-8 pt-8 animate-fade-in-up delay-500 opacity-0">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">SSL</p>
            <p className="text-xs text-white/30 mt-1">Xavfsiz</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="text-center">
            <p className="text-2xl font-bold text-white">Fast</p>
            <p className="text-xs text-white/30 mt-1">Tezkor</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="text-center">
            <p className="text-2xl font-bold text-white">Free</p>
            <p className="text-xs text-white/30 mt-1">Bepul</p>
          </div>
        </div>
      </div>
    </div>
  );
}
