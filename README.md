# Alera

Mobile platform for tracking habits, analyzing trends, and querying personal data with an AI assistant. Alera lets users log daily habits, view metrics, and get personalized insights through a conversational interface.

## Problem

Users generate personal data continuously (health, productivity, wellbeing), but insights are often fragmented. Alera addresses this by enabling:

- Consistent habit logging.
- Trend visualization from processed metrics.
- Natural‑language insights via AI.
- Clear dashboards for daily/weekly/monthly views.

## System Architecture

The system is composed of these main layers:

1. **Mobile App (Frontend)** — React Native + Expo.
2. **Backend/API** — Node.js REST API (read‑only for metrics).
3. **Database** — PostgreSQL via Supabase.
4. **Auth** — Supabase Auth with JWT.
5. **AI** — OpenAI API (or mock).
6. **Data Pipeline** — AWS (EventBridge + Lambda + S3 + Glue + Athena) for metrics processing.
7. **DevOps** — GitHub Actions + Docker.

## Mobile App

### Stack

- React Native + Expo.
- Single codebase for Android and iOS.

### Core features (MVP)

1. User authentication (login + signup).
2. Habit logging (unlimited habits).
3. Metrics visualization (daily/weekly/monthly from `metrics`).
4. AI assistant (limited context).
5. Basic habit goals management.

### Data handled

- User profile.
- Raw habit logs.
- Processed metrics (read‑only).
- AI conversation history.
- Per‑habit goals.

## Backend API

### Responsibilities

The Node.js backend:

- Exposes REST endpoints for the mobile app.
- Validates Supabase JWTs.
- Implements business logic for habits, logs, goals, profiles.
- Prepares limited context for the AI assistant.
- **Does not** compute metrics (read‑only from `metrics`).

### Implemented processes (MVP)

- CRUD for habits and logs.
- Input validation.
- AI chat + history endpoints.
- Basic rate limiting per user.
- Metrics endpoints (read‑only from `metrics`).

## Database [Supabase]

### Security

- Supabase Auth manages identity and JWT.
- Row Level Security (RLS) isolates data per user.

## AI Assistant

### Usage

- Conversational assistant about recent habits.
- Limited context prepared by the backend.

### Context included

- Metrics for today.
- Metrics for the last 7 days.
- Metrics for the last 3 months.
- Last 7 days of AI conversations.

## CI/CD Pipeline

1. Trigger on push or pull request.
2. Linting.
3. Backend and Frontend build.
4. Docker image build.
