# Creative-Writing-LLM-Benchmark

A **Next.js-based benchmarking platform** for comparing large language models on **creative writing quality**.

This project implements an **LLM-as-a-judge evaluation pipeline** with **theme coherence scoring**, persistent run history, interactive leaderboards, and visual analytics.

---

## Features

- Compare multiple LLMs on creative writing prompts  
- LLM-as-a-judge evaluation pipeline  
- Theme coherence scoring (**0–10 scale**)  
- Persistent run history  
- Interactive charts and leaderboards  
- LiteLLM integration for model routing  
- Clean, reproducible benchmarking UI  

---

## Project Structure

```text
app/                 Next.js app router
components/          Reusable visualization components
lib/                 Benchmarking and scoring logic
docs/screenshots/    README screenshots
litellm-config.yaml  LiteLLM routing config
docker-compose.yml   Optional container setup
```

---

## How to Run (Local)
- Install dependencies:
  npm install
- Create env file:
  cp .env.local.example .env.local
- Start dev server:
  npm run dev
- Open browser:
  http://localhost:3000

---

## How to Run with LiteLLM
- Install LiteLLM:
  pip install litellm
- Start LiteLLM proxy:
  litellm --config litellm-config.yaml --port 4000
- Update .env.local:
  LITELLM_BASE_URL=http://localhost:4000
- Run the app:
  npm run dev

---

## Architecture Overview

```text
┌────────────────────────┐
│        Frontend        │
│   Next.js + React UI   │
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│     API Routes         │
│  /api/benchmark        │
│  /api/config-models    │
│  /api/model-metadata   │
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│   LLM-as-a-Judge       │
│  Theme Coherence Eval  │
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│        LiteLLM         │
│  Multi-model routing   │
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│  OpenAI / Anthropic    │
│  Other LLM Providers   │
└────────────────────────┘
```
---

## Project Structure

```text
app/
 ├─ api/
 │   ├─ benchmark/
 │   ├─ config-models/
 │   └─ model-metadata/
 ├─ leaderboard/
 └─ page.tsx

components/
 ├─ LeaderboardChartCard.tsx
 ├─ ThemeCoherenceLineChart.tsx
 └─ AnimatedBar.tsx

lib/
 ├─ bench.ts
 ├─ judge.ts
 ├─ leaderboardStore.ts
 ├─ modelColors.ts
 └─ storage.ts

docs/
 └─ screenshots/

litellm-config.yaml
```

##Screenshots

## 🖼️ Screenshots

### UI Overview
![UI Overview](docs/screenshots/01_ui_overview.png)

### Model Comparison with Scores
![Model Comparison](docs/screenshots/02_model_comparison_with_scores.png)

### Single Model Run
![Single Model Run](docs/screenshots/03_single_model_run.png)

### Top Models per Task
![Top Models](docs/screenshots/04%20Top%20models%20per%20tasks.png)

### Theme Coherence Over Runs
![Theme Coherence](docs/screenshots/05%20Theme%20Coherence%20over%20Runs%20%26%20Model%20comparison.png)




