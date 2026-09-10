# News App — Database Schema Specification

> Historical snapshot of the original multilingual schema. The live database is defined by `supabase/migrations/` in filename order. Translation tables were removed in `20261010120000_production_security_media_drop_translations.sql`. `articles.title/subtitle/summary/slug` and `*_text` columns on quiz/opinion rows are the source of truth. `media_type` is IMAGE, VIDEO, AUDIO.

## 1. Purpose

This document defines the PostgreSQL data model for the News App.

The system is a multilingual, gamified news/knowledge platform consisting of:

- Android application
- Responsive web application
- Admin dashboard
- Superadmin dashboard
- FastAPI backend
- Supabase PostgreSQL database
- Supabase Auth
- Supabase Storage

The database must enforce data integrity and user isolation wherever practical.

Application-level validation in FastAPI is required, but database constraints and Row Level Security (RLS) are treated as an additional security boundary.

---

# 2. Design Principles

## 2.1 One logical article

An article has one logical identity regardless of language.

```text
Article
├── English
├── Hindi
└── Telugu