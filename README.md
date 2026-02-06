# Juice Factory ERP + CRM (MVP)

This repo includes:
- `db/schema.sql` for PostgreSQL
- `backend/` Fastify API skeleton
- `frontend/` RTL Arabic UI mock
- `docs/` API + ERD + assumptions

## Run (local)

### Backend
1. Install dependencies in `backend/`
2. Set `DATABASE_URL` (see `backend/.env.example`)
3. Run `npm run dev`

### Frontend
Open `frontend/index.html` in a browser, or run a simple static server.

### Database
Apply `db/schema.sql` to your PostgreSQL database, then run `db/seed.sql`.

## Notes
- API endpoints are stubbed to unblock frontend integration.
- Accounting postings are planned in the service layer (next step).
