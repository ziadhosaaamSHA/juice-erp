# Docker Deployment

## Build + Run (local)

```bash
docker compose up --build
```

Services:
- Backend: http://localhost:4000
- Frontend: http://localhost:8080
- Postgres: localhost:5432

## Initialize DB

```bash
psql "postgres://juice_user:juice_pass@localhost:5432/juice_erp" -f db/schema.sql
psql "postgres://juice_user:juice_pass@localhost:5432/juice_erp" -f db/seed.sql
```

## Environment

Copy `.env.example` to `.env` and adjust as needed.
