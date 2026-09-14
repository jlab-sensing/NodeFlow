# Backend testing guide

## Run the CI test suite

From the repository root, use the dedicated Compose test project. If `.env` does
not exist, create it with `cp .env.example .env` first.

```bash
docker compose --project-name nodeflow-ci-local --profile ci build backend-test
docker compose --project-name nodeflow-ci-local --profile ci up \
  --abort-on-container-exit \
  --exit-code-from backend-test \
  backend-test
```

This starts a dedicated PostgreSQL test service and runs pytest with coverage.
The command exits with the test container's status. To export its coverage report
before cleanup:

```bash
docker compose --project-name nodeflow-ci-local --profile ci cp \
  backend-test:/app/coverage.xml ./coverage.xml
```

Clean up the test containers and volumes after the run:

```bash
docker compose --project-name nodeflow-ci-local --profile ci down --volumes
```

The explicit project name keeps cleanup separate from your development stack.

## Run pytest locally

Install `backend/requirements-dev.txt` in your Python 3.11 virtual environment as
described in [CONTRIBUTING.md](../../CONTRIBUTING.md). Local runs require
PostgreSQL server binaries for `pytest-postgresql`, or a `TEST_DATABASE_URL`
pointing to a disposable PostgreSQL database whose name contains `test`.
The fixtures create and drop application tables in that database.

From `backend/`, run:

```bash
python -m pytest
python -m pytest --cov=app --cov-report=term-missing
```

## Fixtures and test discovery

NodeFlow uses pytest and FastAPI's `TestClient`. Fixtures in `conftest.py` provide
database sessions, API clients, and test users. `pytest-postgresql` manages a
local database process when `TEST_DATABASE_URL` is unset.

`backend/pytest.ini` discovers `test_*.py` files in `backend/tests/`. See the
[pytest fixture guide](https://docs.pytest.org/en/stable/how-to/fixtures.html)
for fixture patterns.

## Formatting and linting

The **Backend quality** CI job checks Ruff formatting and linting separately from
the **Backend tests** job. For installation, checks, and automatic fixes, see
[the contributing guide](../../CONTRIBUTING.md#backend-formatting-and-linting).
