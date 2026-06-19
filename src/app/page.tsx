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
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold text-white">
          Real-Time Chat
        </h1>
        <p className="text-gray-400 max-w-md">
          Soddalik bilan yaratilgan real-time chat ilovasi. Vercelga deploy
          qilishga tayyor.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/auth/login"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Kirish
          </Link>
          <Link
            href="/auth/register"
            className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
          >
            Ro&apos;yxatdan o&apos;tish
          </Link>
        </div>
      </div>
    </div>
  );
}
