/*
  
  Supabase Dashboard > SQL Editor dan ishga tushiring:
  
  1. Profiles jadvali (foydalanuvchi ma'lumotlari)
  2. Messages jadvali (chat xabarlar)
  3. RLS (Row Level Security) siyosatlari
  4. Real-timeni yoqish
  
*/

-- Profiles jadvali
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages jadvali
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS ni yoqish
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Profiles: o'z profilini o'qish va yangilash
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Messages: hamma xabarlarni o'qish, faqat o'zini yozish
CREATE POLICY "Anyone can read messages" ON messages
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Real-timeni yoqish
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
