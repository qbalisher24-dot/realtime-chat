# Real-Time Chat

Vercelga deploy qilishga tayyor real-time chat ilovasi.

## Tech Stack

- **Frontend**: Next.js 16 + TypeScript + Tailwind CSS
- **Backend**: Supabase (Auth + Database + Realtime)
- **Deploy**: Vercel (serverless)

## O'rnatish

1. **Supabase yarating**:
   - [supabase.com](https://supabase.com) da ro'yxatdan o'ting
   - Yangi project yarating
   - Dashboard > SQL Editor dan `supabase-schema.sql` ni ishga tushiring

2. **Environment variables**:
   ```bash
   cp .env.local.example .env.local
   ```
   `.env.local` faylini to'ldiring:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

3. **Local ishga tushirish**:
   ```bash
   npm run dev
   ```
   [http://localhost:3000](http://localhost:3000) da oching

## Vercelga Deploy

1. GitHub ga push qiling
2. [vercel.com](https://vercel.com) ga kiring
3. "New Project" > GitHub repo ni import qiling
4. Environment variables qo'shing:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Deploy tugmasini bosing

## Foydalanish

1. Ro'yxatdan o'ting (email + parol + username)
2. Chat sahifasiga o'ting
3. Xabar yozing - boshqa foydalanuvchilarga real-time ko'rinadi

## Xususiyatlar

- Real-time xabarlar (Supabase Realtime)
- Email/Parol autentifikatsiya
- Responsive dizayn (mobile + desktop)
- Dark mode
# realtime-chat
