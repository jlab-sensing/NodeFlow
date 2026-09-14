# NodeFlow Backend API

## Introduction

The NodeFlow backend uses [FastAPI](https://fastapi.tiangolo.com/), SQLModel, and
PostgreSQL. A Socket.IO ASGI application wraps FastAPI to serve realtime updates.

## Authentication

The NodeFlow API uses access and refresh tokens for user authentication. The
authentication implementation is in `app/auth/`.

## Getting started

Follow the [root README](../README.md#getting-started) to start the application
with Docker Compose. The backend is available at <http://localhost:8001>, and
interactive API documentation is at <http://localhost:8001/docs>.

## Local development and quality checks

Use Python 3.11. From the repository root, create a virtual environment and
install development dependencies:

```bash
python3.11 -m venv .venv
source .venv/bin/activate
python -m pip install -r backend/requirements-dev.txt
```

This installs application dependencies, pytest tooling, and Ruff. To install only
Ruff, use `python -m pip install -r backend/requirements-quality.txt` instead.

Run quality checks from `backend/`:

```bash
python -m ruff format --check .
python -m ruff check .
```

Apply fixes with `python -m ruff check --fix .`, then format with
`python -m ruff format .`. Configuration is in `pyproject.toml`.

See [CONTRIBUTING.md](../CONTRIBUTING.md) for the complete development workflow
and [the testing guide](tests/README.md) for backend tests. CI reports **Backend
tests** and **Backend quality** as separate checks.
