.PHONY: help install seed test run-backend run-frontend docker-up docker-down

help:
	@echo "Available commands:"
	@echo "  make install       - Install backend and frontend dependencies"
	@echo "  make seed          - Seed synthetic database (~40 institutions, ~300 cases, 15 scenarios)"
	@echo "  make test          - Run pytest test suite"
	@echo "  make run-backend   - Start FastAPI backend server on port 8000"
	@echo "  make run-frontend  - Start Vite React frontend on port 5173"
	@echo "  make docker-up     - Start complete system with Docker Compose"
	@echo "  make docker-down   - Stop Docker Compose services"

install:
	cd backend && python -m venv venv && .\venv\Scripts\pip install -r requirements.txt
	cd frontend && npm install

seed:
	cd backend && .\venv\Scripts\python -m app.seed

test:
	cd backend && .\venv\Scripts\python -m pytest -v app/tests

run-backend:
	cd backend && .\venv\Scripts\uvicorn app.main:app --reload --port 8000

run-frontend:
	cd frontend && npm run dev -- --port 5173

docker-up:
	docker compose up --build

docker-down:
	docker compose down
