# Alera

Plataforma móvil inteligente para el registro, análisis y consulta de datos personales mediante IA. Alera permite a los usuarios documentar sus hábitos diarios, analizar tendencias y obtener insights personalizados a través de un asistente conversacional integrado.

## Problema o necesidad que atiende

Los usuarios generan datos personales de forma continua sobre sus hábitos y actividades diarias (salud, productividad y bienestar). Sin embargo, estas métricas suelen estar dispersas o sin análisis estructurado. Alera resuelve esto al permitir:

- Registrar información de forma organizada y consistente.
- Analizar tendencias básicas a partir de datos históricos.
- Obtener insights personalizados mediante lenguaje natural.
- Visualizar métricas clave de manera clara e intuitiva.

## Arquitectura del sistema

La arquitectura se compone de seis capas principales:

1. **Aplicación móvil (Frontend)** — React Native + Expo.
2. **Backend/API** — Node.js con API REST y cron jobs.
3. **Base de datos** — PostgreSQL administrado con Supabase (local).
4. **Autenticación** — Supabase Auth con JWT.
5. **Inteligencia artificial** — Integración vía OpenAI API (o mock académico).
6. **DevOps** — CI/CD con GitHub Actions y Docker.

## Aplicación móvil (cliente)

### Tipo de aplicación

- React Native + Expo.
- Código único para Android e iOS.

### Funcionalidades principales (MVP)

1. Autenticación de usuarios (login y registro).
2. Registro de hábitos diarios (hábitos ilimitados).
3. Visualización de métricas diarias básicas.
4. Asistente conversacional con IA (contexto limitado).
5. Gestión básica de objetivos diarios.

### Tipo de información gestionada

- Datos de perfil del usuario.
- Registros diarios de hábitos.
- Métricas diarias agregadas.
- Historial limitado de conversaciones con IA.
- Objetivos diarios por hábito.

## Servidor (Backend API)

### Funciones del servidor

El backend en Node.js actúa como núcleo del sistema y es responsable de:

- Exponer una API REST para la aplicación móvil.
- Validar tokens JWT emitidos por Supabase Auth.
- Orquestar la lógica de negocio.
- Ejecutar cron jobs para análisis de datos.
- Preparar contexto y comunicarse con la IA.

### Procesos implementados (MVP)

- CRUD de registros de hábitos.
- Validación de datos de entrada.
- Cálculo de métricas diarias.
- Ejecución de un cron job diario.
- Integración con IA con contexto limitado.
- Rate limiting básico por usuario.
- Métricas semanales y mensuales.
- Comparaciones entre períodos.
- Análisis predictivo.

## Base de datos

### Tablas principales

**habits**

- id (UUID)
- user_id (UUID)
- name (VARCHAR)
- type (VARCHAR) — numeric | json
- unit (VARCHAR)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

**habits_log**

- id (UUID)
- user_id (UUID)
- habit_id (UUID)
- value (JSONB)
- metadata (JSONB)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

**metrics**

- id (UUID)
- user_id (UUID)
- habit_id (UUID)
- metric_type (VARCHAR) — daily_average
- value (NUMERIC)
- date (DATE)
- calculated_at (TIMESTAMP)

**ai_conversations**

- id (UUID)
- user_id (UUID)
- message (TEXT)
- role (VARCHAR)
- created_at (TIMESTAMP)

**user_goals**

- id (UUID)
- user_id (UUID)
- habit_id (UUID)
- target_value (NUMERIC)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### Seguridad

- Supabase Auth gestiona identidad y JWT.
- Row Level Security (RLS) garantiza aislamiento por usuario.

## Inteligencia artificial

### Uso de IA

La IA se utiliza como un asistente conversacional que:

- Responde preguntas sobre hábitos recientes.
- Usa contexto limitado preparado por el backend.

### Contexto incluido

- Métricas del día actual.
- Métricas de los últimos 7 días.
- Métricas de los últimos 3 meses.
- Últimos 7 días de interacciones con el asistente.

### Pipeline CI/CD

1. Trigger por push o pull request.
2. Análisis de código (ESLint).
3. Build del backend.
4. Construcción de imagen Docker.
