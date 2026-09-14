# Contributing to NodeFlow

Use Docker with Compose for the application and backend tests, Python 3.11 for
local backend development, and Node.js 22.19.0 with npm for the frontend.
Run commands from the repository root unless a section says otherwise.

## Backend environment

Create and activate a virtual environment, then install the development
dependencies:

```bash
python3.11 -m venv .venv
source .venv/bin/activate
python -m pip install -r backend/requirements-dev.txt
```

On Windows, activate the environment with `.venv\Scripts\Activate.ps1` in
PowerShell. Development requirements include the application dependencies, Ruff,
and pytest tooling. Runtime dependencies remain in `backend/requirements.txt`.

If you only need to format or lint Python, install the smaller quality dependency
set in your activated environment instead:

```bash
python -m pip install -r backend/requirements-quality.txt
```

## Backend formatting and linting

Ruff provides both formatting and linting. Its version is pinned in
`backend/requirements-quality.txt`, and its configuration is in
`backend/pyproject.toml`. Run these commands from `backend/`:

```bash
python -m ruff format --check .
python -m ruff check .
```

To apply supported lint fixes and format the code:

```bash
python -m ruff check --fix .
python -m ruff format .
```

Review the resulting diff and fix any remaining lint findings manually. Imports
that register database models can be required even when no symbol is referenced;
preserve their `# noqa: F401` annotations in `alembic/env.py`.

## Backend tests

Run the same container test suite as CI from the repository root. If `.env` does
not exist yet, create it with `cp .env.example .env` before using Compose.

```bash
docker compose --project-name nodeflow-ci-local --profile ci build backend-test
docker compose --project-name nodeflow-ci-local --profile ci up \
  --abort-on-container-exit \
  --exit-code-from backend-test \
  backend-test
```

The test service uses a dedicated PostgreSQL database and generates a coverage
report. The project name keeps these containers separate from the normal
development stack. When finished, clean up that test project:

```bash
docker compose --project-name nodeflow-ci-local --profile ci down --volumes
```

See the [backend testing guide](backend/tests/README.md) for coverage export and
local pytest options.

## Frontend checks

Run these commands from `frontend/`:

```bash
npm ci
npm run format:check
npm run lint
npm run test:ci
npm run build
```

Use `npm run format` to apply Prettier formatting.

## Pull requests and the merge queue

[NodeFlow CI](.github/workflows/test.yml) runs four jobs:

| Check | What it verifies |
| --- | --- |
| Backend tests | Backend pytest suite and coverage in Docker |
| Backend quality | Ruff formatting and linting |
| Frontend quality | Prettier, ESLint, and Vitest |
| Frontend build | Production frontend build |

The workflow runs on pull requests, pushes to `main`, and merge queue
`merge_group` events. Queue checks validate the proposed merge with the current
base and any preceding queued changes.

After the workflow containing **Backend quality** has landed on `main` and the
check is available, a repository maintainer must add **Backend quality** to the
required status checks in the `main` branch ruleset alongside the other three
checks. Adding the job to the workflow alone does not make it required for merging.
