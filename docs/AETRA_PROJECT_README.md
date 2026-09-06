# AETRA / Cognition News — Project Master README

> Authoritative engineering handoff for continuing the project in Cursor.
> Current handoff date: 2026-09-04.

## 1. Product

AETRA (Advanced Educational Transition Resilient Academy), implemented in this repository as Cognition News, is an interactive educational/news/knowledge platform — not merely a conventional news site.

Core experience:

```text
DISCOVER → READ → THINK → QUESTION → FORM AN OPINION
→ PARTICIPATE → COMPLETE → EARN XP/LEVELS/BADGES → SHARE
```

Product philosophy:

- BREAK THROUGH THE BIAS.
- BE PROUD OF YOUR OPINION.
- SHARE YOUR OPINION AS MANY AS YOU CAN.

The final AETRA requirements describe a platform combining articles, opinions, interactive questions, quizzes, public participation, media, promotions, advertising, gamification, analytics and administration. fileciteturn67file0L1-L20

V1 is a responsive website. Native mobile application work is out of current V1 scope, while the backend should remain reusable for future clients.

---

## 2. Technology

Backend:

- Python
- FastAPI
- Pydantic
- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Storage
- pytest

Repository:

```text
News-app/
├── backend/
├── frontend/
├── mobile/
├── supabase/
└── docs/
```

The backend is the authoritative layer for business rules, validation, authorization, gamification, content state and database interaction.

---

## 3. Authority

Use this order:

```text
FINAL AETRA REQUIREMENTS
+
LATER CLIENT CLARIFICATIONS
+
CURRENT REPOSITORY
```

Older handoffs are historical. If they conflict with the locked decisions below, ignore them.

---

## 4. Locked decisions

### One Superadmin

Final model:

```text
USER + ONE SUPERADMIN
```

The Superadmin is the client. Do not create an ordinary Admin hierarchy, Editor, Moderator, Content Writer or Advertisement Manager.

The AETRA requirements themselves recommend one Super Admin for V1.

### Multilingual support removed

Do not build new multilingual functionality, language selectors, translation APIs or language preferences. Historical translation tables/code may remain until the final cleanup safely removes genuinely obsolete pieces.

### Campaigns removed

Do not build campaigns, sponsored campaigns or campaign management. The original AETRA proposal mentions campaigns, but later client clarification removed them from this V1.

### Sponsored articles removed

Do not build a sponsored-article system.

### Webinar/podcast hosting removed

Webinars and podcasts may be represented by external links/embeds. Do not build hosting platforms. The AETRA document explicitly describes podcast-link/embed usage as the inexpensive V1 approach.

### Gamification stays

Keep:

```text
XP
LEVELS
BADGES
```

XP must be server-controlled. Never trust client-provided XP, level, badge or quiz correctness. Duplicate rewards must be prevented and article completion must be idempotent.

### No AI in V1

Do not build AI article generation, AI quiz generation, AI search, AI recommendations or automatic translation. The AETRA document recommends keeping full AI generation out of V1.

---

## 5. Completed backend feature areas

The major backend feature implementation phase is complete.

```text
Database / RLS foundation       COMPLETE
Authentication                  COMPLETE
Users                           COMPLETE
Categories                      COMPLETE
Articles                        COMPLETE
Article blocks                  COMPLETE
Reading progress                COMPLETE
Article completion              COMPLETE
Quizzes                         COMPLETE
Opinions                        COMPLETE
Home / discovery                COMPLETE
Gamification                    COMPLETE
Sharing backend                 COMPLETE
User/profile progress           COMPLETE
Podcast linking/embedding       COMPLETE
Comments                        COMPLETE
Search                          COMPLETE
Promotional carousel            COMPLETE
Advertising                     COMPLETE
Analytics                       COMPLETE
Superadmin management           COMPLETE
Audit logging                   COMPLETE
```

This means implemented; it does **not** mean the final security/integration audit is complete.

### Articles

Structured article content supports insertion of interactive elements between sections, matching the AETRA interactive reading concept.

### Quizzes

Server-side correctness is authoritative. Do not trust correctness supplied by the client.

### Opinions

Supports predefined opinion responses and custom opinion responses where enabled. The AETRA requirements describe the central flow as read → think → select opinion → share.

### Gamification

Implemented XP, levels, badges, XP rules, transactions and badge awarding. Level thresholds remain configurable from administration, consistent with AETRA.

### Profile

The intended profile exposes name, image, XP, level, completed articles, quiz performance, opinions, badges and achievement history.

### Sharing

Backend supplies durable achievement/opinion/completion data. Frontend owns visual share cards and allows users to revisit achievement history and share again.

### Media

Superadmin media management includes upload/list/detail/delete, MIME validation, private storage, signed URLs and reference protection. Current private bucket is `article-media`; upload limit is 10 MB.

### Promotions

Promotional carousel is separate from advertising. Items support image, title, description, external URL, event date, display order, active state and visibility windows.

### Advertising

Advertising is separate from promotions:

```text
ADVERTISEMENT SLOT → ADVERTISEMENT → PUBLIC ELIGIBILITY
```

Includes slots, ads, scheduling, active state, order, media and click analytics. Do not build an ad auction/network or advertiser billing system.

### Comments

Users can create/edit/delete their own comments. Superadmin can hide/unhide/delete. Public retrieval excludes hidden/deleted comments.

### Search

Basic V1 search only: titles, categories, topics and keywords. No AI/semantic search or unnecessary search infrastructure.

### Analytics

Analytics foundation covers product metrics such as article views, unique readers, completion, quiz activity, opinion participation, comments, shares, category popularity, user engagement and advertisement clicks.

### Audit logging

`backend/app/services/audit.py` already exists.

Audit records contain:

```text
actor_user_id
action
entity_type
entity_id
metadata
created_at
```

`created_at` is UTC.

Administrative mutations across Superadmin management, media, promotions, advertisements/slots and comment moderation now call the audit service.

---

## 6. Important backend areas

Current relevant routers include:

```text
articles.py
categories.py
completions.py
opinions.py
progress.py
quizzes.py
users.py
media.py
promotions.py
advertisements.py
comments.py
analytics.py
superadmin_content.py
superadmin_interactive.py
superadmin_management.py
```

There may be more. Always inspect the repository before changing anything.

Important supporting areas:

```text
backend/app/core/
backend/app/db/
backend/app/dependencies/
backend/app/schemas/
backend/app/services/
backend/app/main.py
supabase/migrations/
```

Do not casually modify the shared Supabase client infrastructure.

---

## 7. Development method

The established method is:

```text
INSPECT
→ UNDERSTAND
→ COMPARE WITH AETRA
→ IDENTIFY GAP
→ IMPLEMENT SMALLEST CORRECT CHANGE
→ TEST
→ FULL SUITE
→ VERIFY
→ CONTINUE
```

Rules:

1. Inspect current code/schema first.
2. Do not assume old files are unchanged.
3. Do not rewrite working systems without reason.
4. Do not duplicate existing endpoints.
5. Do not invent features outside scope.
6. Add/verify focused tests.
7. Run the focused tests.
8. Run the complete backend suite.
9. Only say tests pass if they were actually run.

The last verified full-suite baseline was **222 passing tests** even after audit logging was added.

---

## 8. Immediate next phase

Major backend feature implementation is finished.

Next:

```text
1. FULL WORKFLOW TESTING
2. FULL BACKEND REGRESSION TESTING
3. SECURITY + RLS AUDIT
4. LEGACY CLEANUP
5. API STABILIZATION
6. FRONTEND
7. FRONTEND/BACKEND INTEGRATION
8. PRODUCTION HARDENING
9. DEPLOYMENT
10. FINAL QA
```

Do **not** start by inventing another major feature.

---

## 9. Full workflow testing

Test complete journeys, not only isolated endpoints.

### Anonymous

```text
Home
→ category
→ article
→ public media
→ promotion
→ eligible advertisement
→ search
```

### Authenticated user

```text
Login
→ profile
→ article
→ reading progress
→ interactive question
→ quiz
→ opinion
→ completion
→ XP
→ level
→ badge
→ achievement/share data
→ comment
→ edit own comment
→ delete own comment
```

### Idempotency

```text
Complete article → reward
Repeat completion → no duplicate reward
```

Also test duplicate-sensitive XP actions.

### Moderation

```text
Post comment
→ visible

Superadmin hide
→ public comment disappears

Superadmin unhide
→ visible again

Superadmin delete
→ public comment disappears
```

### Promotions

```text
Superadmin create
→ public visibility when eligible
→ inactive/future/expired content excluded
```

### Advertising

```text
Superadmin create slot
→ create ad
→ schedule/activate
→ public eligibility
→ click
→ analytics event
→ redirect
```

### Media

```text
Upload
→ metadata
→ storage object
→ signed URL

Referenced asset
→ deletion rejected

Unreferenced asset
→ deletion succeeds
```

### Superadmin

For every privileged endpoint:

```text
No authentication → reject
USER → forbid
SUPERADMIN → allow
```

---

## 10. Security audit

Review:

- authentication
- authorization
- ownership
- IDOR/cross-user access
- privilege escalation
- RLS
- validation
- external URLs
- media access
- database constraints
- duplicate prevention
- inactive-user behavior
- Superadmin boundaries
- storage policies
- error handling

Security requirements in AETRA explicitly include secure authentication, authorization, protected user information, server-side quiz validation, input validation, database constraints, protected media and protection against XP manipulation.

Attack-test IDs such as:

```text
user_id
article_id
comment_id
media_id
promotion_id
advertisement_id
slot_id
badge_id
level_id
xp_rule_id
```

Do not assume that knowing a valid UUID grants access.

---

## 11. Legacy cleanup

After security/workflow testing, inspect:

```text
old Admin assumptions
old multilingual logic
old campaign assumptions
unused translation APIs
duplicate routers
duplicate schemas
unused services
dead imports
obsolete tests
```

Always:

```text
SEARCH REFERENCES
→ VERIFY
→ CLEAN
→ TEST
→ FULL SUITE
```

Do not blindly delete historical database structures.

---

## 12. API stabilization

Before frontend integration, verify:

- endpoint naming
- request/response schemas
- status codes
- error consistency
- authentication expectations
- API versioning
- pagination/filter conventions
- OpenAPI
- frontend-required fields
- signed media URL behavior
- date/time formats

The frontend should consume verified contracts, not guessed endpoints.

---

## 13. Frontend scope

The responsive website should ultimately include:

```text
Authentication
Home/discovery
Categories
Article reader
Reading progress
Quizzes
Opinions
Article completion
XP
Levels
Badges
Achievement/share cards
Promotional carousel
Advertisements
Comments
Profile
Search
Superadmin dashboard
SEO/AEO/GEO foundation
```

AETRA requires a desktop/tablet/mobile-browser responsive website and SEO/AEO/GEO-ready foundation.

---

## 14. Frontend article experience

Target conceptual flow:

```text
Advertisement
→ Category
→ Headline
→ Author
→ Date
→ Reading time
→ Hero image
→ Introduction
→ Article content
→ Interactive question
→ Continue reading
→ Opinion
→ Media
→ Advertisement
→ Final quiz
→ Article completed
→ XP earned
→ Achievement card
→ Share opinion
→ Related articles
→ Advertisement
```

This follows the AETRA article-page concept. fileciteturn67file11L1-L20

---

## 15. Frontend design philosophy

AETRA should feel:

- modern
- editorial
- educational
- dynamic
- premium
- interactive
- advertising-friendly

Use strong typography, editorial cards, large imagery, interactive question cards, XP indicators, subtle motion and responsive grids.

But:

> **Readability always wins over excessive animation.**

---

## 16. SEO / AEO / GEO

Frontend must implement:

- SEO-friendly URLs
- page titles
- meta descriptions
- Open Graph metadata
- structured article data
- sitemap
- robots configuration
- canonical URLs
- fast loading
- mobile responsiveness
- search-engine-readable article content

These are explicit AETRA requirements. fileciteturn67file11L20-L35

---

## 17. Production hardening

Before launch:

```text
Environment variables
Secrets
CORS
HTTPS
Rate limiting where justified
Logging
Monitoring
Error handling
Supabase configuration
Storage configuration
Database security
API security
Frontend security
```

Never expose service-role credentials in the frontend.

---

## 18. Deployment

Expected sequence:

```text
Production backend configuration
→ production Supabase verification
→ backend deployment
→ frontend deployment
→ API/environment integration
→ production smoke tests
→ end-to-end tests
→ final QA
→ launch
```

Domain, hosting, storage, email, analytics services, ad-provider accounts and future APIs are operational costs, not unlimited development deliverables. fileciteturn67file2L1-L20

---

## 19. Scope boundaries

Do not build:

```text
❌ Campaign system
❌ Sponsored articles
❌ Multiple admin hierarchy
❌ Multilingual feature
❌ AI generation
❌ AI search
❌ AI recommendation engine
❌ Complex trending algorithm
❌ Podcast hosting
❌ Webinar hosting
❌ Ad auction/network
❌ Advertiser billing platform
❌ Complex social network
❌ Threaded comments
❌ Native mobile V1 application
❌ Unnecessary microservices
❌ Giant CMS abstraction
❌ V2 features
```

Build only what the final requirements and current verified implementation require.

---

## 20. Final engineering motto

> **The simplest professional and production grade implementation that completely satisfies the final AETRA requirements.**

No unnecessary complexity.

No speculative features.

No rewrite for the sake of rewriting.

The project is now in the **verification → security → cleanup → frontend → integration → deployment** phase.
