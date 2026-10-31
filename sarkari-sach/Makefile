.PHONY: up migrate ingest provisions snapshot api worker web test eval eval-test demo
up:         ; docker compose up -d db redis
migrate:    ; cd backend && alembic upgrade head
ingest:     ; python -m corpus.build --sources pib,gazette,myscheme --since 2025-01-01
provisions: ; python -m corpus.provisions && python -m corpus.relations
snapshot:   ; python -m corpus.snapshot
api:        ; cd backend && uvicorn app.main:app --reload
worker:     ; cd backend && arq app.worker.WorkerSettings
web:        ; cd frontend && npm run dev
test:       ; cd backend && pytest -q
eval:       ; python -m eval.run --split dev && python -m eval.score
eval-test:  ; python -m eval.run --split test --holdout-debunks --seed 7 && python -m eval.score --report
demo:       ; ./scripts/demo_seed.sh
