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
  <a href="https://www.python.org/" style="text-decoration: none;"><img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python"></a>&nbsp;
  <a href="https://scikit-learn.org/" style="text-decoration: none;"><img src="https://img.shields.io/badge/scikit--learn-F7931E?style=for-the-badge&logo=scikitlearn&logoColor=white" alt="scikit-learn"></a>&nbsp;
</p>

<p align="center"><strong>In Progress / Planned</strong></p>

<p align="center">
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
- **Apple Watch support**: Habit logs support `mobile` and `watch` sources for cross-device tracking.
- Automated metrics calculation via Supabase Edge Function (`calculate-metrics`).
- Stats views powered by `metrics` table (totals, streaks, activity, goal progress).
- AI chat coach via Supabase Edge Function (`ai-chat`) using user context.
- Supervision model (token-based linking between supervisor and monitored profiles).
- **ML Predictions Pipeline**: Full training/inference pipeline for production predictions:
  - Data maturity tiers: `locked` (insufficient data), `basic` (initial insights), `full` (comprehensive predictive power).
  - Prediction types: `streak_risk`, `trajectory`, `goal_eta`, `best_reminder`.
  - Daily automated execution via GitHub Actions.
- Kubernetes deployment configuration with Helm charts.
- Docker containerization for web deployment.
- RLS-based data security in Supabase.

### In Progress / Pending

- Final UI/UX refinements in Stats and general app polish.
- Expanded Apple Watch companion app features.

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

## Apple Watch Support

Habit logs can be created from multiple sources:

- **Mobile**: Logs created via the main React Native app
- **Watch**: Logs created via Apple Watch companion app

The logging system tracks the source (`mobile` or `watch`) for each entry, enabling seamless cross-device habit tracking and analytics.

## Supervision Model

Alera supports supervised usage:

- A user can share a unique supervision token.
- Another user can link using that token and become supervisor.
- Supervisor can create/manage habits for the monitored profile.
- Monitored user keeps direct habit logging capability.

Access is enforced by Supabase RLS policies.

## ML Predictions Pipeline

The ML pipeline runs daily (6:30 UTC) to generate data-driven predictions for each user's habits. Located in the `ml/` directory.

### Architecture

- **Entry point**: `pipeline.py` — processes all profiles and their active habits
- **Feature engineering**: `features.py` — builds feature matrices from habit logs
- **Model training**: `models.py` — generates predictions using scikit-learn
- **Data maturity**: `maturity.py` — evaluates readiness for predictions (3 tiers):
  - **Locked**: < 7 days of data → no predictions
  - **Basic**: 7–29 days → basic predictions (streak_risk, trajectory)
  - **Full**: ≥ 30 days → all predictions + advanced metrics

### Predictions

- **streak_risk**: Probability of breaking current streak
- **trajectory**: Long-term habit adherence trend
- **goal_eta**: Estimated time to reach goal (full tier, numeric habits)
- **best_reminder**: Optimal time to send reminders (full tier)

Predictions are stored in the `predictions` table and consumed by the stats UI. Run locally with:

```bash
cd ml
python pipeline.py --dry-run  # Preview predictions without writing
python pipeline.py             # Run production pipeline
```

## Deployment

### Docker & Kubernetes

- **Docker**: Frontend containerized as `alera-web` (see `alera_UI/Dockerfile`)
- **Kubernetes**: Deployment config in `k8s/` with 2 replicas, health checks, and resource limits
- **Helm**: Chart in `helm/alera/` for templated deployments

Apply Kubernetes manifests:

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/
```

Or deploy via Helm:

```bash
helm install alera ./helm/alera/
```

### CI/CD

GitHub Actions workflows in `.github/workflows/`:

- **frontend-ci.yml**: Runs on every push and PR to main
  - Linting, type checking, testing
  - Builds Docker image on success
- **ml-predictions.yml**: Scheduled daily (6:30 UTC) + manual trigger
  - Runs ML pipeline to update predictions

## Project Structure

```
alera_UI/              # React Native mobile app (Expo)
├── src/               # Application source code
├── supabase/          # Edge functions (AI chat, metrics calculation)
├── assets/            # App icons and images
├── Dockerfile         # Web deployment container
└── package.json       # Dependencies

ml/                    # Python ML pipeline
├── pipeline.py        # Main entry point (daily scheduler)
├── models.py          # Prediction models
├── features.py        # Feature engineering
├── maturity.py        # Data maturity evaluation
├── seed/              # Database seeding scripts
└── requirements.txt   # Python dependencies

k8s/                   # Kubernetes manifests
├── deployment.yaml    # Web app deployment
├── service.yaml       # Service configuration
└── namespace.yaml     # Namespace setup

helm/                  # Helm chart
└── alera/             # Helm chart for Alera

.github/workflows/     # GitHub Actions
├── frontend-ci.yml    # Frontend testing and Docker build
└── ml-predictions.yml # Scheduled ML predictions

docs/                  # Project documentation
└── personalNotes/     # Internal technical notes
```

## Main Tech Stack

- **Frontend**: React Native, Expo, TypeScript, React Navigation, NativeWind
- **Backend/Data**: Supabase (PostgreSQL + Auth + Edge Functions)
- **AI**: OpenAI API
- **ML**: Python, scikit-learn (predictions pipeline)
- **Deployment**: Docker, Kubernetes, Helm
- **CI/CD**: GitHub Actions
- **Testing**: Jest + React Native Testing Library

## Notes

- This project is under active development.
- Some roadmap features are documented but not fully shipped yet.
