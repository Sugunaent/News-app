# Frontend–Backend Integration Audit

Source of truth: `frontend/TMZ_Frontend` UI, types, and `src/lib/api.ts` / `src/lib/admin/api.ts` signatures.  
Production data model: `News-app/supabase` + FastAPI `backend/`.  
Do not apply `frontend/TMZ_Frontend/supabase` migrations (parallel TMS schema).

Auth: Supabase Auth (email/password + Google). FastAPI uses the user JWT. Roles: `USER` | `SUPERADMIN`.

---

## Status legend

| Status | Meaning |
|---|---|
| already implemented | Backend+DB can satisfy the feature after a mapping adapter |
| partially implemented | Core exists; fields, lookup keys, or endpoints incomplete |
| missing | No production table/endpoint |
| incompatible | Shape or security model differs from frontend contract |
| security/RLS | Policy/auth gap |

---

## Feature matrix

| FEATURE | FRONTEND EXPECTATION | EXISTING BACKEND | EXISTING DB | GAP | REQUIRED CHANGE | STATUS |
|---|---|---|---|---|---|---|
| Auth (email/Google) | `auth.tsx` + `VITE_SUPABASE_*`; session JWT | JWT via `get_current_user` | `auth.users` + `profiles` trigger | Frontend API calls do not send JWT today | Keep Supabase auth; API client attaches `Authorization` | already implemented |
| Profile read | `UserProfile`: id, email, display_name, avatar_url, xp, level, bio | `GET /api/v1/users/me` + `/me/profile` + `/gamification/me` | `profiles`, `xp_transactions`, `levels` | Nested backend shape; no `bio`; avatar is `avatar_media_id` | Map aggregate → flat profile; add `profiles.bio` | partially implemented |
| Profile update / avatar | `updateProfile`, `uploadAvatar`, `updateAvatar` | Superadmin media upload only | `profiles.avatar_media_id`, storage `article-media` | No user PATCH / avatar endpoint | `PATCH /users/me`; user avatar upload | missing |
| Categories | `{id,name,slug,description,image_url}` | `GET /api/v1/categories` → `{items}` | `categories` (no `image_url`) | Wrapper + missing image | Unwrap `items`; add `image_url` | partially implemented |
| Article list / latest / category / featured / authors picks | `Article` with `cover_image_url`, `category_id`, `is_featured`, `is_authors_pick`, `reading_time_minutes`, `author_name`, route `/article/:id` | `GET /articles`, `/home/discovery`, teasers | `articles` + `is_author_pick`; no `is_featured` / cover URL / reading time | Teaser shape ≠ `Article`; featured missing; detail is slug + JWT | Extend teaser columns; UUID-or-slug GET; optional auth | incompatible |
| Article body / blocks | `ArticleWithBlocks.blocks[]` (`block_type`, `order_index`, nested quiz/opinion/podcast) | `GET /articles/{slug}` discriminated `type`/`display_order` | `article_blocks` | Shape mismatch; quiz is multi-question; body requires JWT; RLS blocks anon | Adapter maps blocks; FastAPI serves published body; keep direct-Supabase RLS | incompatible |
| Quizzes | One question, `options[].is_correct`, `xp_reward`; `submitQuizAttempt(quizId,…optionId)`; `hasUserAttemptedQuiz` | `GET /quizzes/article/{id}`; `POST /quizzes/{id}/attempts` `{question_id,selected_option_id}` | `quizzes`, `quiz_questions`, `quiz_options.is_correct` | Flatten first question; include `is_correct` for QuizBlock UI; resolve option→question; attempted GET | Adapter + `GET …/attempted` | partially implemented |
| Opinions | `options: string[]`; submit option **text**; `allow_custom_text`; +50 XP toast | `POST /opinions/{question_id}/responses` option UUID or custom | `opinion_questions/options/responses` | Match text→option id; submitted GET | Adapter + `GET …/submitted` | partially implemented |
| Reading progress | `{percentage, scroll_position, completed}` | `GET/PUT /articles/{id}/progress` (`progress_percentage`, `last_position`) | `reading_progress` | Field names | Map in API layer | partially implemented |
| Completions / share cards | `createCompletionCard` → xp/level; `CompletionCard` | `POST /articles/{id}/completion` `{article_id,completed_at}` + XP rules | `article_completions`, `xp_transactions` | Response lacks xp/level/card | Compose completion + gamification + profile share_cards | partially implemented |
| XP / levels / badges | `Level.level_number`+`xp_threshold`; `Badge`+`UserBadge` | `GET /gamification/me` | `xp_rules`, `levels.minimum_xp/display_order`, `badges` | No public catalog list | `GET /gamification/levels` and `/badges` | partially implemented |
| Bookmarks / saved | `add/remove/isBookmarked/fetchSavedArticles` | none | none in production | New table + CRUD | `article_bookmarks` + `/api/v1/bookmarks` | missing |
| Comments (reader) | List without login; create/delete own; `display_name`,`avatar_url` | JWT-required list/create/delete | `comments` + visible RLS | Auth required for list; no avatar | Optional auth list; map author | partially implemented |
| Promotions | `{image_url,external_url,date_time,active}` | `GET /api/v1/promotions` media object | `promotional_items` | Shape mapping | Adapter | already implemented |
| Ads (reader) | `ConditionalAdSlot` is a stub (`enabled=false`) | Public ads API exists | `advertisements` | UI does not fetch ads | No UI change; CMS still uses ads API | already implemented |
| Hero banner | `HeroConfig` + localStorage | none | none | Persist in DB | `site_settings` + `/api/v1/site/hero` | missing |
| Team / about | `TeamMember[]` | none | none | New table | `team_members` + public GET | missing |
| Contact | Public enquiry + feedback POSTs | none | none | New tables | `business_enquiries`, `feedback` | missing |
| Settings appearance | Theme local only | n/a | n/a | none | none | already implemented |
| Superadmin gate | Page allows any signed-in user (`isAdmin=true`) | All `/superadmin/*` require `SUPERADMIN` | `profiles.role` | UI vs API | Keep backend enforcement; do not change UI | incompatible (intentional) |
| Superadmin articles | `AdminArticle` + filters; editor does **not** POST blocks | CRUD + publish/schedule/author-pick + block APIs | `articles` | Metadata mapping; slug required; type `ARTICLE` vs `STANDARD`; cover URL | Map types/fields; generate slug; `cover_image_url` column | partially implemented |
| Superadmin categories | CRUD + `image_url` | CRUD | `categories` | `image_url` | Column + map | partially implemented |
| Superadmin quizzes/opinions | Flat quiz/opinion CMS | Nested questions/options APIs | quizzes/opinions | Flatten in admin API layer | Adapter using existing nested APIs | partially implemented |
| Superadmin comments | Paginated `{items,total}` + status + delete | `{items,total}` hidden/deleted flags | `comments` | Map `is_hidden` → status | Adapter | already implemented |
| Superadmin users | status active/suspended; role string | list + `PATCH …/status` `is_active` | `profiles` | No role PATCH; status enum vs bool | Map status; add role PATCH | partially implemented |
| Superadmin XP/levels/badges | `action`/`xp_amount`; `level_number`/`xp_threshold` | `event_type`/`amount`; `display_order`/`minimum_xp` | existing | Name mapping | Adapter | already implemented |
| Superadmin promotions/ads/media | frontend admin types | `/promotions`, `/advertisements`, `/media` | existing | Shape mapping | Adapter | already implemented |
| Superadmin analytics | `AnalyticsData.totals/engagement/recent_activity` | `GET /analytics/dashboard` different shape | `analytics_events` | Map dashboard → CMS cards | Adapter | partially implemented |
| Superadmin feedback/enquiries | paginated lists + status | none | none | New admin routes | Add with RLS | missing |
| Superadmin audit | `{actor_name,details.summary}` | `GET /superadmin/audit-logs` | `audit_logs` | Field mapping | Adapter | already implemented |
| Superadmin authors picks order | localStorage ordered IDs | `PATCH …/author-pick` per article | `is_author_pick`,`author_pick_order` | Persist order via existing field | Adapter calling author-pick | partially implemented |
| CORS | Vite `:3000` → API | **No CORS** | n/a | Browser blocked | CORSMiddleware | missing |
| Frontend API wiring | All data from mock `api.ts` / `admin/api.ts` | REST `/api/v1/*` | n/a | Mocks not connected | Replace function bodies; keep signatures | missing |

---

## Already implemented (reuse)

- Health, categories list, article teasers, home discovery, search
- Auth JWT + profile ensure-on-login
- Reading progress, quiz attempts (server-side correctness), opinion responses
- Article completion + `award_xp` / badges
- Comments CRUD + superadmin moderation
- Promotions, advertisements, media, analytics dashboard, audit logs
- Superadmin article/category/quiz/opinion/user/XP/level/badge CMS
- Storage bucket `article-media` + signed URLs

## Partially implemented

- Article/category/user/gamification **shapes** (adapter)
- Article detail lookup (slug vs UUID) and auth requirement
- Quiz/opinion nested vs flat frontend types
- Completions/share cards vs `CompletionCard`
- Superadmin user status/role, analytics, author picks

## Missing

- CORS
- Bookmarks
- Hero `site_settings`
- Team members
- Feedback + business enquiries
- User profile PATCH + avatar
- Public levels/badges catalog endpoints
- Quiz attempted / opinion submitted GETs
- Frontend HTTP client

## Incompatible (handled by adapter, not UI rewrite)

| Topic | Frontend | Backend | Approach |
|---|---|---|---|
| Article type | `ARTICLE`/`FEATURED`/`PODCAST`/… | `STANDARD`/`QUIZ`/`OPINION`/`PODCAST` | Map `ARTICLE`↔`STANDARD`; `is_featured` column |
| Blocks | `block_type`,`order_index`,`content` | `type`,`display_order`,`text` | Map in `api.ts` |
| Quiz | One question + `is_correct` on options | Multi-question; correctness hidden on GET | Flatten Q1; include `is_correct` for QuizBlock |
| Opinion options | `string[]` | `{id,option_text}` | Map labels; match text on submit |
| Progress | `percentage`,`scroll_position` | `progress_percentage`,`last_position` | Map |
| Superadmin CMS access | Any logged-in user | `SUPERADMIN` only | Backend stays strict |
| Article body RLS | Page loads article without login | Blocks readable by `authenticated` only | FastAPI service-role **published** read; RLS unchanged for direct Supabase |

## Security / RLS

- Do **not** expose service-role key to the frontend (already only in backend `.env`).
- Keep article-body RLS for PostgREST; FastAPI may read published bodies for the existing guest article page.
- New tables must enable RLS: own-row bookmarks; public read team/hero; insert feedback/enquiries; superadmin select/update.
- User isolation: bookmarks, progress, comments, XP, completions scoped by `auth.uid()` / JWT `user.id`.
- Quiz XP remains server-trusted (`is_correct` from DB), even if UI also reads `is_correct`.

## Frontend files allowed to change (Phase 3)

- `src/lib/api.ts` (function bodies)
- `src/lib/admin/api.ts` (function bodies)
- New `src/lib/backendClient.ts` (HTTP + mapping)
- `.env.example` / `vite.config.ts` proxy + `VITE_API_BASE_URL` only

No page/component/style/route changes.

## Implementation plan (Phase 2–3)

1. Migration `20260914120000_frontend_integration_extensions.sql`
2. FastAPI CORS + new routers + small extensions
3. Replace mock API bodies with mapped REST calls
4. Tests + frontend build

---

## Phase 4 results (updated after implementation)

_See bottom of this file after verification._

## USER/SUPERADMIN STABILITY FIX

- **Issue**: Latest marquee glow clipping, zeroed share-card XP values in the profile summary, and podcast block URL validation rejecting valid external or internal media sources.
- **Root cause**: the glow effect was painted into a clipped layer and the profile card mapping reset `xp_gained` to `0` instead of using the backend reward data, while the podcast block validation only accepted a narrow subset of URL shapes and treated valid external sources as invalid.
- **Fix**: the glow layer was moved to an overflow-visible border wrapper while preserving the existing card dimensions and marquee motion; the profile summary now derives share-card XP from the backend aggregate when present and falls back only to actual transaction values instead of a hardcoded zero; the podcast player accepts valid http/https media URLs and keeps the existing open-source link in place without weakening the validation beyond the supported media URL patterns.
- **Files changed**: `frontend/TMZ_Frontend/src/components/articles/GlowingEffect.tsx`, `frontend/TMZ_Frontend/src/pages/ProfilePage.tsx`, `frontend/TMZ_Frontend/src/components/articles/blocks/PodcastBlock.tsx`.
- **Verification result**: `npm run typecheck` completed successfully in the frontend project, and `npm run build` also completed successfully. This confirms the patched code compiles cleanly in the real project configuration; however, it does not claim the entire 10-issue backlog is done because broader backend integration tests and live browser/session verification remain outside the scope of this targeted patch.

## USER-SIDE FIXES

- **fixed** Global user-side performance: profile entry now uses the authenticated aggregate profile response, saved articles use the authenticated bookmark endpoint, and bookmark status reads are deduplicated with a short-lived cache. Normal pages retain bookmark controls without repeated identical reads.
- **fixed** Quiz answer flow: removed the redundant profile fetch after submission and render the existing explanation directly below the selected option.
- **fixed** Completion timing: completion waits for the comments target to load and become visible, finalizes the server completion reward before opening the share card, and suppresses repeat rewards/cards for an existing completion.
- **fixed** Contact and feedback success: confirmations now render directly below each form on Home and About; validation, loading, and error paths remain unchanged.
- **fixed** Profile data: profile identity, XP/level, completion counts, quiz statistics, opinions count, achievements, reading history, share cards, badges, and saved articles are mapped from authenticated backend data where the current API contract provides them.
- **fixed** Avatar persistence: Settings uploads the selected image through `/api/v1/users/me/avatar` into the existing `article-media` bucket, persists `avatar_media_id`, resolves a signed URL, validates image type and a 10 MB limit, and reports storage/metadata failures instead of showing success.
- **fixed** Footer categories: the Explore list is sourced from `GET /api/v1/categories` and uses the returned slugs/names.
- **fixed** Latest marquee: the existing glow remains outside the card's image clipping container, and its duration is slightly faster (`35s` to `32s`) while pause and infinite motion remain unchanged.
- **root cause** The main latency sources were redundant profile reads, profile fan-out requests, unbounded per-instance bookmark status reads, and completion UI being opened before the completion request resolved. The other user-facing defects were response-shape/placeholder implementations and DOM placement issues.
- **files changed** `frontend/TMZ_Frontend/src/lib/api.ts`, `src/pages/ProfilePage.tsx`, `src/pages/ArticlePage.tsx`, `src/pages/HomePage.tsx`, `src/pages/SettingsPage.tsx`, `src/components/articles/blocks/QuizBlock.tsx`, `src/components/articles/CommentsSection.tsx`, `src/components/common/ContactSection.tsx`, `src/components/layout/Footer.tsx`, `src/index.css`, and `backend/app/routers/users.py`.
- **tests/verification** Frontend `npm run typecheck` and `npm run build` pass; editor diagnostics report no errors in touched frontend files. The full backend suite runs in `backend/.venv` but currently has pre-existing unrelated failures across advertisements, analytics, articles, comments, completions, gamification, health, and superadmin modules; it does not provide a clean regression signal for this batch. System Python did not have pytest installed.
- **remaining issues** Backend tests need to be reconciled with the current router/schema state before they can serve as a reliable full-suite gate. Browser-level persistence checks against a live Supabase project were not available in this environment, so avatar storage and real-user profile isolation still require live authenticated verification.

## 2026-09-16 VERIFIED CONTINUATION

- **Profile synchronization**: Profile now renders identity, XP, and level from the freshly fetched authenticated aggregate response instead of retaining stale auth-profile values after a refresh.
- **Quiz and opinion persistence**: Quiz text/options resolve the deployed translation shape, quiz submissions use the authenticated RLS client, opinion updates use the authenticated client, and malformed chained responses cannot leak into the response model.
- **Completion and share cards**: Completion writes remain on the service-role path required by the current insert policy; persisted profile share cards are now loaded from the aggregate endpoint; completion sharing falls back to `article_completions` when reading progress has no timestamp.
- **XP animation**: Zero-value completion/opinion rewards no longer display a `+0 XP` animation. Confirmation and share-card UI still render.
- **Advertisements**: The article ad slot now calls the public eligible-ad endpoint and uses the existing click redirect route. It remains absent when no eligible ad exists.
- **Performance**: Article completion no longer fetches the profile twice or fetches levels twice in the same flow.
- **Verification**: Frontend `npm run typecheck` and `npm run build` pass after these changes. The focused quiz/opinion suite passes; the remaining broader backend failures are fixture/schema-contract mismatches documented above, not evidence of a clean live Supabase end-to-end run. Live authenticated browser verification still requires configured Supabase credentials and data.
