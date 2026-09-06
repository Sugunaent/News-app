# AETRA / Cognition News — Superadmin Handoff

This document is the detailed Superadmin handoff. Read it together with `docs/AETRA_PROJECT_README.md`.

## 1. Final model

```text
USER
+
ONE SUPERADMIN
```

The Superadmin is the client.

No ordinary Admin dashboard or administrative hierarchy is part of final V1.

Do not introduce Editor, Moderator, Content Writer, Advertisement Manager or multiple admin tiers.

---

## 2. Superadmin responsibility

The backend management layer covers the appropriate AETRA areas:

```text
Articles
Categories
Publishing
Quizzes
Opinions
Media
Promotions
Advertisements
Advertisement slots
Users
Gamification configuration
Comments / moderation
Analytics
Audit/accountability
```

The AETRA requirements explicitly call for Superadmin control over content, users, ads, quizzes, opinions, media, analytics and publishing. fileciteturn67file6L1-L20

The system deliberately uses multiple feature routers instead of a giant generic CMS.

---

## 3. Current management areas

Relevant current routers:

```text
backend/app/routers/superadmin_content.py
backend/app/routers/superadmin_interactive.py
backend/app/routers/superadmin_management.py
backend/app/routers/media.py
backend/app/routers/promotions.py
backend/app/routers/advertisements.py
backend/app/routers/comments.py
backend/app/routers/analytics.py
```

Always search the repository before creating a new endpoint.

---

## 4. User management

Current Superadmin management includes:

```text
GET /api/v1/superadmin/users
GET /api/v1/superadmin/users/{user_id}
PATCH /api/v1/superadmin/users/{user_id}/status
```

Capabilities:

- list/search/filter users
- inspect user/profile/progress
- activate/deactivate
- prevent prohibited self-deactivation

Do not expose password or token manipulation.

AETRA calls for appropriate user administration and profile/progress inspection, not authentication-internals management.

---

## 5. Content management

Superadmin content functionality covers appropriate article/content administration including:

- articles
- categories
- article blocks
- publishing
- draft/published state
- scheduling where implemented
- media relationships
- interactive content relationships

Publishing remains human-controlled.

Do not introduce AI publishing or a generic CMS.

---

## 6. Interactive management

Quiz and opinion management is implemented.

Quiz correctness remains server-authoritative.

Opinion functionality follows the AETRA concept:

```text
READ → THINK → OPINION → SHARE
```

Do not trust client-provided correctness or XP.

---

## 7. Gamification management

Current Superadmin configuration includes:

```text
XP rules
Levels
Badges
```

Do not add arbitrary user XP grant or direct user level/badge mutation unless the client explicitly changes the requirement.

The AETRA document allows level thresholds to remain configurable through administration. fileciteturn67file18L1-L8

---

## 8. Comments

Superadmin moderation is implemented:

```text
PATCH /api/v1/articles/{article_id}/comments/{comment_id}/moderation
DELETE /api/v1/articles/{article_id}/comments/{comment_id}/admin
```

Moderation supports:

```text
hidden = true
hidden = false
```

Admin delete uses the existing soft-delete field.

Public comments exclude hidden/deleted comments.

This satisfies the required moderation behavior.

---

## 9. Media

Superadmin media operations include:

- list
- detail
- upload
- delete
- reference inspection
- signed URL generation

Current storage bucket:

```text
article-media
```

Maximum upload:

```text
10 MB
```

Referenced assets cannot be deleted.

The final security audit must verify API authorization and Storage RLS agree.

---

## 10. Promotions

Superadmin promotion operations:

- list all
- create
- update
- delete

Promotion data:

```text
image
title
description
external URL
event date
display order
active/inactive
starts_at
ends_at
```

Public retrieval filters visibility.

Promotions are distinct from advertisements.

---

## 11. Advertisements

Superadmin advertisement management includes:

### Ads

- list
- inspect one
- create
- update
- delete

### Slots

- list
- create
- update
- delete

Architecture:

```text
SLOT
 ↓
ADVERTISEMENT
 ↓
PUBLIC ELIGIBILITY
```

Public clicks generate analytics.

Do not add:

```text
campaigns
ad auctions
advertiser billing
advertising networks
```

---

## 12. Analytics

Superadmin-only analytics dashboard exists.

Conceptual endpoint:

```text
GET /api/v1/analytics/dashboard
```

Metrics include:

```text
article views
unique readers
reading completion
quiz attempts
quiz success
opinion participation
comments
shares
popular categories
user engagement
advertisement clicks
```

This is an analytics foundation, not a giant analytics platform. fileciteturn67file4L1-L15

---

## 13. Audit logging

Existing service:

```text
backend/app/services/audit.py
```

Do not recreate it.

It provides:

```text
record_audit(...)
list_audit_logs(...)
```

Audit records:

```text
actor_user_id
action
entity_type
entity_id
metadata
created_at
```

Timestamp is UTC.

Administrative mutations now audited include the current Superadmin management, media, promotion, advertising/slot and comment moderation operations.

Examples:

```text
USER_STATUS_UPDATED

XP_RULE_CREATED
XP_RULE_UPDATED
XP_RULE_DELETED

LEVEL_CREATED
LEVEL_UPDATED
LEVEL_DELETED

BADGE_CREATED
BADGE_UPDATED
BADGE_DELETED

MEDIA_UPLOADED
MEDIA_DELETED

PROMOTION_CREATED
PROMOTION_UPDATED
PROMOTION_DELETED

ADVERTISEMENT_CREATED
ADVERTISEMENT_UPDATED
ADVERTISEMENT_DELETED

ADVERTISEMENT_SLOT_CREATED
ADVERTISEMENT_SLOT_UPDATED
ADVERTISEMENT_SLOT_DELETED

COMMENT_HIDDEN
COMMENT_UNHIDDEN
COMMENT_DELETED
```

Inspect the actual current code before assuming action names.

Do not put secrets, passwords or tokens into audit metadata.

---

## 14. Audit design

Administrative mutations are audited.

Ordinary reads are not automatically treated as mutation audit events.

Examples of reads:

```text
GET user
GET comments
GET analytics
GET media
```

General user activity belongs to analytics.

If the frontend needs audit-history viewing, use the existing `list_audit_logs()` service rather than creating another audit store.

---

## 15. Authorization

Every Superadmin management operation must enforce:

```text
authenticated
+
role == SUPERADMIN
```

The frontend is not a security boundary.

The actor ID must come from the authenticated context, never from a request body.

---

## 16. Superadmin security test matrix

For every privileged endpoint:

```text
No token
→ unauthorized

USER
→ forbidden

SUPERADMIN
→ allowed
```

Also test IDOR-style substitutions of:

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

Verify a valid UUID belonging to another resource/user cannot bypass authorization.

---

## 17. Audit verification

For every successful administrative mutation verify:

```text
actor_user_id = authenticated Superadmin
action = expected action
entity_type = expected entity
entity_id = affected record
metadata = useful non-sensitive details
created_at = valid UTC timestamp
```

Failed mutations must not create misleading successful mutation records.

---

## 18. Superadmin end-to-end flow

Conceptual flow:

```text
SUPERADMIN LOGIN
      ↓
DASHBOARD
      ↓
ANALYTICS
      ↓
USERS
      ↓
ARTICLES / CATEGORIES / PUBLISHING
      ↓
QUIZZES
      ↓
OPINIONS
      ↓
MEDIA
      ↓
PROMOTIONS
      ↓
ADVERTISEMENTS / SLOTS
      ↓
GAMIFICATION
      ↓
COMMENTS
      ↓
AUDIT HISTORY
```

The exact frontend navigation is flexible. The backend contracts are not.

---

## 19. Frontend dashboard

Build the frontend only after backend verification.

Logical dashboard sections:

```text
Overview
Analytics
Users
Articles
Categories
Quizzes
Opinions
Media
Promotions
Advertisements
Gamification
Comments
Audit Log
```

This is an information architecture, not a requirement to create one giant page.

---

## 20. Frontend rule

Frontend handles:

```text
layout
forms
navigation
loading
errors
responsive UI
visual feedback
```

Backend handles:

```text
authorization
validation
publishing state
media rules
XP
levels
badges
eligibility
moderation
database integrity
```

Never move security-sensitive business rules into the frontend.

---

## 21. Final Superadmin audit

Before frontend completion, inspect:

### Authorization

- every management endpoint
- every dependency
- every router
- every relevant RLS policy

### IDOR

Try valid IDs belonging to other resources.

### RLS

Verify ordinary users cannot modify administrative data.

### Audit

Perform a mutation and verify the corresponding audit row.

### Failure behavior

Verify failed mutations do not generate false successful audit events.

---

## 22. Legacy Admin cleanup

After workflow/security testing:

```text
SEARCH ADMIN REFERENCES
→ determine whether still required
→ remove/consolidate only obsolete pieces
→ migration if required
→ tests
→ full suite
```

Do not blindly delete all occurrences of `ADMIN`; some historical schema or compatibility logic may require deliberate migration.

---

## 23. Legacy multilingual cleanup

Similarly inspect:

```text
translation
language
locale
language_id
translated fields
translation routers
translation schemas
```

The final product is not multilingual, but historical structures may be intertwined with working code.

Clean only after tracing dependencies.

---

## 24. Current status

```text
User management             COMPLETE
Content management          COMPLETE
Interactive management      COMPLETE
Gamification management     COMPLETE
Media management            COMPLETE
Promotion management        COMPLETE
Advertisement management    COMPLETE
Comment moderation          COMPLETE
Analytics                   COMPLETE
Audit logging               COMPLETE
```

Remaining work is:

```text
VERIFY
→ TEST
→ SECURITY/RLS AUDIT
→ CLEANUP
→ API STABILIZATION
→ FRONTEND DASHBOARD
→ INTEGRATION
→ DEPLOYMENT
→ FINAL QA
```

---

## 25. Do not duplicate

Before adding a management endpoint:

```text
SEARCH ROUTERS
SEARCH SERVICES
SEARCH SCHEMAS
SEARCH MAIN.PY
SEARCH TESTS
```

If the capability already exists:

```text
USE IT
OR
CONSOLIDATE IT
```

Do not create parallel `/admin`, `/superadmin` and `/management` versions of the same function without a genuine architectural reason.

---

## 26. Immediate next step

Do not add another major feature.

Start with:

```text
Repository-wide backend inspection
→ workflow test plan
→ audit-log regression tests
→ full pytest suite
→ security/RLS audit
→ legacy cleanup
→ API stabilization
```

Then begin frontend work using the verified backend as the contract.

---

## 27. Final Superadmin motto

> **One client. One Superadmin. One secure, auditable management layer.**

Keep it:

```text
simple
secure
auditable
professional
testable
```
