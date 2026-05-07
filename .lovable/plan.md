# Make the repository safe to publish publicly

The current `.env` only contains the Supabase URL and the **anon/publishable key**, both of which are designed to ship in the frontend bundle and are safe in public code as long as Row Level Security is enabled (which this project does). So nothing in the current `.env` is actually a secret leak.

That said, to make the repo cleanly publishable and prevent future leaks, I'll do the following.

## Changes I'll make in the project

1. **Update `.gitignore`** — append:
   ```
   # Environment variables
   .env
   .env.local
   .env.*.local
   ```

2. **Create `.env.example`** with placeholder values so collaborators know what to set:
   ```
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

3. **Leave `.env` on disk** (untouched) so your local dev keeps working.

## Steps you'll need to run yourself (I can't run git commands)

After I push the changes above, run locally:

```bash
git rm --cached .env
git add .gitignore .env.example
git commit -m "Ignore .env, add .env.example"
git push
```

## Optional but recommended

- **Purge `.env` from Git history** before going public (otherwise old commits still expose it):
  ```bash
  git filter-repo --path .env --invert-paths
  git push --force
  ```
- **Confirm RLS is enabled on every table** in Lovable Cloud — this is what keeps the anon key safe to expose. I can run a security scan to verify if you'd like.
- No key rotation needed for the current `.env` contents (anon key is public by design).

## Out of scope

- No application code, UI, or database changes.
- No changes to Phase 1–4 Risk Guard work.

Confirm and I'll apply the file changes.
