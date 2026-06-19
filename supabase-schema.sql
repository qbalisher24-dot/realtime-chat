-- 1) Eski narsalarni tozalash
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS is_conversation_member(UUID);
DROP PUBLICATION IF EXISTS supabase_realtime;

DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Profiles: view all" ON profiles;
DROP POLICY IF EXISTS "Profiles: insert own" ON profiles;
DROP POLICY IF EXISTS "Profiles: update own" ON profiles;

DROP POLICY IF EXISTS "Members can view conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Admins can update conversations" ON conversations;
DROP POLICY IF EXISTS "Conversations: view" ON conversations;
DROP POLICY IF EXISTS "Conversations: create" ON conversations;
DROP POLICY IF EXISTS "Conversations: update" ON conversations;

DROP POLICY IF EXISTS "Members can view conversation members" ON conversation_members;
DROP POLICY IF EXISTS "Admins can manage members" ON conversation_members;
DROP POLICY IF EXISTS "Admins can remove members" ON conversation_members;
DROP POLICY IF EXISTS "Members: view" ON conversation_members;
DROP POLICY IF EXISTS "Members: insert" ON conversation_members;
DROP POLICY IF EXISTS "Members: delete" ON conversation_members;

DROP POLICY IF EXISTS "Members can view messages" ON messages;
DROP POLICY IF EXISTS "Members can insert messages" ON messages;
DROP POLICY IF EXISTS "Users can update own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON messages;
DROP POLICY IF EXISTS "Anyone can read messages" ON messages;
DROP POLICY IF EXISTS "Messages: view" ON messages;
DROP POLICY IF EXISTS "Messages: insert" ON messages;
DROP POLICY IF EXISTS "Messages: update" ON messages;
DROP POLICY IF EXISTS "Messages: delete" ON messages;

DROP TABLE IF EXISTS conversation_members CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 2) Profillar
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT DEFAULT '',
  online BOOLEAN DEFAULT false,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3) Suhbatlar
CREATE TABLE conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('direct', 'group', 'channel')),
  name TEXT,
  description TEXT DEFAULT '',
  avatar_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4) A'zolar
CREATE TABLE conversation_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  muted BOOLEAN DEFAULT false,
  pinned BOOLEAN DEFAULT false,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

-- 5) Xabarlar
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  reply_to UUID REFERENCES messages(id) ON DELETE SET NULL,
  edited BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6) RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 7) Helper function (recursion yo'q, SECURITY DEFINER)
CREATE OR REPLACE FUNCTION is_conversation_member(conv_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM conversation_members
    WHERE conversation_id = conv_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 8) Profiles policies
CREATE POLICY "Profiles: view all" ON profiles FOR SELECT USING (true);
CREATE POLICY "Profiles: insert own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Profiles: update own" ON profiles FOR UPDATE USING (auth.uid() = id);

-- 9) Conversations policies
CREATE POLICY "Conversations: view" ON conversations FOR SELECT USING (
  type = 'channel' OR is_conversation_member(id)
);
CREATE POLICY "Conversations: create" ON conversations FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Conversations: update" ON conversations FOR UPDATE USING (
  is_conversation_member(id)
);

-- 10) Conversation members policies
CREATE POLICY "Members: view" ON conversation_members FOR SELECT USING (
  is_conversation_member(conversation_id)
);
CREATE POLICY "Members: insert" ON conversation_members FOR INSERT WITH CHECK (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM conversations
    WHERE id = conversation_id AND created_by = auth.uid()
  )
);
CREATE POLICY "Members: delete" ON conversation_members FOR DELETE USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM conversations
    WHERE id = conversation_id AND created_by = auth.uid()
  )
);

-- 11) Messages policies
CREATE POLICY "Messages: view" ON messages FOR SELECT USING (
  is_conversation_member(conversation_id)
);
CREATE POLICY "Messages: insert" ON messages FOR INSERT WITH CHECK (
  auth.uid() = user_id AND is_conversation_member(conversation_id)
);
CREATE POLICY "Messages: update" ON messages FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Messages: delete" ON messages FOR DELETE USING (auth.uid() = user_id);

-- 12) Indexes
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX idx_messages_user ON messages(user_id);
CREATE INDEX idx_members_conversation ON conversation_members(conversation_id);
CREATE INDEX idx_members_user ON conversation_members(user_id);
CREATE INDEX idx_conversations_type ON conversations(type);

-- 13) Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_members;

-- 14) Signup trigger
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
