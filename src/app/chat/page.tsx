"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import ChatList from "@/components/ChatList";
import ChatWindow from "@/components/ChatWindow";
import CreateGroupModal from "@/components/CreateGroupModal";

export default function ChatPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showMobileSidebar, setShowMobileSidebar] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push("/auth/login");
        return;
      }
      setUserId(data.user.id);
      setLoading(false);
    };
    getUser();
  }, [supabase, router]);

  const handleOpenChat = (conversationId: string) => {
    setSelectedChat(conversationId);
    setShowMobileSidebar(false);
    window.history.pushState({}, "", `/chat?id=${conversationId}`);
  };

  const handleChatSelect = (conversationId: string) => {
    handleOpenChat(conversationId);
  };

  const handleGroupCreated = (conversationId: string) => {
    setRefreshKey((k) => k + 1);
    handleOpenChat(conversationId);
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

  if (!userId) return null;

  return (
    <div className="h-screen flex p-4 gap-4">
      <div className="w-80 shrink-0 hidden sm:flex flex-col">
        <div className="flex-1 overflow-hidden flex flex-col glass-strong rounded-3xl">
          <Sidebar
            onOpenChat={handleOpenChat}
            onCreateGroup={() => setShowCreateGroup(true)}
            onCreateChannel={() => setShowCreateChannel(true)}
          />
          <div className="flex-1 overflow-hidden">
            <ChatList
              userId={userId}
              selectedChatId={selectedChat}
              onSelect={handleChatSelect}
              refreshKey={refreshKey}
            />
          </div>
        </div>
      </div>

      {showMobileSidebar && (
        <div className="sm:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowMobileSidebar(false)} />
          <div className="relative w-80 h-full glass-strong rounded-r-3xl overflow-hidden flex flex-col">
            <Sidebar
              onOpenChat={handleOpenChat}
              onCreateGroup={() => setShowCreateGroup(true)}
              onCreateChannel={() => setShowCreateChannel(true)}
            />
            <div className="flex-1 overflow-hidden">
              <ChatList
                userId={userId}
                selectedChatId={selectedChat}
                onSelect={handleChatSelect}
                refreshKey={refreshKey}
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0">
        {selectedChat ? (
          <div className="h-full glass-strong rounded-3xl overflow-hidden">
            <ChatWindow
              key={selectedChat}
              conversationId={selectedChat}
              userId={userId}
              onBack={() => {
                setSelectedChat(null);
                setShowMobileSidebar(true);
                window.history.pushState({}, "", "/chat");
              }}
            />
          </div>
        ) : (
          <div className="h-full glass-strong rounded-3xl flex items-center justify-center">
            <div className="text-center space-y-4 animate-fade-in">
              <div className="w-20 h-20 rounded-3xl glass-strong flex items-center justify-center mx-auto">
                <svg className="w-10 h-10 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-white/20 text-lg font-medium">Chat tanlang</p>
              <p className="text-white/10 text-sm">Suhbatlar ro&apos;yxatidan birini tanlang</p>
            </div>
          </div>
        )}
      </div>

      <CreateGroupModal
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        onCreate={handleGroupCreated}
        type="group"
        userId={userId}
      />
      <CreateGroupModal
        isOpen={showCreateChannel}
        onClose={() => setShowCreateChannel(false)}
        onCreate={handleGroupCreated}
        type="channel"
        userId={userId}
      />
    </div>
  );
}
