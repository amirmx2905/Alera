# Alera

Alera is a mobile habit-tracking app where users create habits, log progress, review analytics, and interact with an AI coach.

## Tech Stack

<p align="center">
  <a href="https://reactnative.dev/" style="text-decoration: none;"><img src="https://img.shields.io/badge/React_Native-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React Native"></a>&nbsp;
  <a href="https://expo.dev/" style="text-decoration: none;"><img src="https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white" alt="Expo"></a>&nbsp;
  <a href="https://www.typescriptlang.org/" style="text-decoration: none;"><img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"></a>&nbsp;
  <a href="https://supabase.com/" style="text-decoration: none;"><img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase"></a>&nbsp;
  <a href="https://www.postgresql.org/" style="text-decoration: none;"><img src="https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL"></a>&nbsp;
  <a href="https://openai.com/" style="text-decoration: none;"><img src="https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white" alt="OpenAI"></a>&nbsp;
  <a href="https://reactnavigation.org/" style="text-decoration: none;"><img src="https://img.shields.io/badge/React_Navigation-CA4245?style=for-the-badge&logo=reactrouter&logoColor=white" alt="React Navigation"></a>&nbsp;
  <a href="https://www.nativewind.dev/" style="text-decoration: none;"><img src="https://img.shields.io/badge/NativeWind-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="NativeWind"></a>&nbsp;
  <a href="https://jestjs.io/" style="text-decoration: none;"><img src="https://img.shields.io/badge/Jest-C21325?style=for-the-badge&logo=jest&logoColor=white" alt="Jest"></a>&nbsp;
</p>

<p align="center"><strong>In Progress / Planned</strong></p>

<p align="center">
  <a href="https://www.python.org/" style="text-decoration: none;"><img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python"></a>&nbsp;
  <a href="https://scikit-learn.org/" style="text-decoration: none;"><img src="https://img.shields.io/badge/scikit--learn-F7931E?style=for-the-badge&logo=scikitlearn&logoColor=white" alt="scikit-learn"></a>&nbsp;
  <a href="https://developer.apple.com/watchos/" style="text-decoration: none;"><img src="https://img.shields.io/badge/Apple_Watch-watchOS-000000?style=for-the-badge&logo=apple&logoColor=white" alt="Apple Watch"></a>&nbsp;
</p>

## Current Project Status

This repository contains an **in-progress** version of Alera.

### Implemented

- Mobile app (Expo React Native) for Android/iOS.
- Auth flow with Supabase Auth (login, signup, OTP verification).
- Profile setup and user session handling.
- Habit creation and management:
  - Habit types: `numeric` and `binary`.
  - Goal frequencies: `daily`, `weekly`, `monthly`.
- Habit logging (`habits_log`) and history per date.
- Automated metrics calculation via Supabase Edge Function (`calculate-metrics`).
- Stats views powered by `metrics` table (totals, streaks, activity, goal progress).
- AI chat coach via Supabase Edge Function (`ai-chat`) using user context.
- Supervision model (token-based linking between supervisor and monitored profiles).
- RLS-based data security in Supabase.

### In Progress / Pending

- Apple Watch companion app.
- Full ML training/inference pipeline for production predictions.
- Final UI/UX refinements in Stats and general app polish.

## Product Overview

Users can create habits and define goals, then log entries over time.

- **Numeric habits** (e.g., drink 2L water, read 20 pages).
- **Binary habits** (done/not done, e.g., meditate today).

Each entry is stored in `habits_log` and processed to generate aggregated metrics (daily totals, streaks, averages, completion indicators), which are persisted in `metrics`.

Predictions are designed to be generated after enough historical data (2–3 weeks), including:

- Streak risk
- Trajectory
- Goal ETA
- Best reminder time

These are stored in `predictions` and consumed by stats/detail screens once available.

## Architecture (Implemented)

The current implementation is **Supabase-first**:

1. **Mobile Frontend**: Expo + React Native + TypeScript
2. **Auth**: Supabase Auth (JWT sessions)
3. **Database**: Supabase PostgreSQL
4. **Security**: Row Level Security policies
5. **Backend Logic**: Supabase Edge Functions
   - `calculate-metrics`
   - `ai-chat`
6. **AI Provider**: OpenAI API

## Core Data Flow

1. User creates habit + goal.
2. User logs habit entries (`habits_log`).
3. `calculate-metrics` edge function recalculates relevant metrics.
4. Metrics are upserted into `metrics`.
5. Stats screens read and visualize those metrics.
6. AI coach reads profile/habit/metrics/chat context and generates personalized responses.

## Supervision Model

Alera supports supervised usage:

- A user can share a unique supervision token.
- Another user can link using that token and become supervisor.
- Supervisor can create/manage habits for the monitored profile.
- Monitored user keeps direct habit logging capability.

Access is enforced by Supabase RLS policies.

## Main Tech Stack

- **Frontend**: React Native, Expo, TypeScript, React Navigation, NativeWind
- **Backend/Data**: Supabase (PostgreSQL + Auth + Edge Functions)
- **AI**: OpenAI API
- **Testing**: Jest + React Native Testing Library

## Notes

- This project is under active development.
- Some roadmap features are documented but not fully shipped yet.
