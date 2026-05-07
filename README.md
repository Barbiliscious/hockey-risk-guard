# Hockey Risk Guard

Hockey Risk Guard is a private risk management web app for hockey club operations.

It is built with React, TypeScript, Vite, Tailwind CSS, shadcn/ui, and Supabase.

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a local `.env` file from `.env.example`.

   `.env` is ignored by Git so local settings do not get published.

3. Add your Supabase browser settings:

   ```bash
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

4. Start the app:

   ```bash
   npm run dev
   ```

## Checks

Run these before publishing changes:

```bash
npm run lint
npm run test
npm run build
```

## Database

Supabase migration files are stored in `supabase_migrations/`.

Before using this app with real data, confirm Row Level Security policies are enabled in Supabase.
