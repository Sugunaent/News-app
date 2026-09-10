# News App

Gamified news and knowledge platform (Cognition / AETRA).

## Applications

- `backend/` — FastAPI API (authoritative business rules)
- `supabase/` — PostgreSQL migrations, RLS, Storage policies
- `docs/` — Project handoff notes

Authentication is **Supabase Auth JWT only** (email/password and Google). The service-role key is never accepted as a user Bearer token.

Article copy lives on `articles` (`title`, `subtitle`, `summary`, `slug`). There is no translation layer.

Published article media is readable by anonymous visitors. Superadmin may upload IMAGE, VIDEO, and AUDIO.
