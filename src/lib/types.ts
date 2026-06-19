export interface Profile {
  id: string;
  username: string;
  email: string;
  avatar_url: string | null;
  bio: string;
  online: boolean;
  last_seen: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  type: "direct" | "group" | "channel";
  name: string | null;
  description: string;
  avatar_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationMember {
  id: string;
  conversation_id: string;
  user_id: string;
  role: "admin" | "member";
  muted: boolean;
  pinned: boolean;
  last_read_at: string;
  joined_at: string;
  profiles?: Profile;
}

export interface Message {
  id: string;
  content: string;
  user_id: string;
  conversation_id: string;
  reply_to: string | null;
  edited: boolean;
  created_at: string;
  updated_at: string;
  profiles?: Profile | null;
}

export interface ConversationWithDetails extends Conversation {
  members?: ConversationMember[];
  last_message?: Message;
  unread_count?: number;
  other_user?: Profile;
}
