# News App — Database Schema Specification

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