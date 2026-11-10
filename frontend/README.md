# Frontend Documentation

## Introduction

The NodeFlow client is being built with [React](https://react.dev/), a component based web library

## Local development

For the full Docker setup, follow the [root README](../README.md). Docker
Compose passes the root `.env` into the frontend container.

To run the frontend directly with npm, start the backend from the repository
root after configuring `.env` using `.env.example`:

```bash
docker compose up --build -d backend
```

Then run:

```bash
cd frontend
npm ci
VITE_API_BASE_URL=http://localhost:8001 npm run dev -- --port 3001
```

Vite does not load the repository root `.env` when started in `frontend/`.
The explicit API URL above points requests to the backend, and port `3001`
matches the default backend CORS and OAuth configuration. Restart the frontend
after changing its environment variables. For Docker, recreate the frontend
container after changing the root `.env`:

```bash
docker compose up -d --force-recreate frontend
```

If demo groups fail to load, inspect `/api/public/deployments/` in the browser's
Network panel. The request should go to `http://localhost:8001` and return a
JSON array (`[]` is valid for an empty database). An HTML response indicates
that the request reached a web page instead of the API; check
`VITE_API_BASE_URL` and restart the frontend.

## Testing

We use vitest to run frontend tests. You can automatically run the frontend tests by running

```
npm run test:ci
```

## Linting

We use eslint as the frontend linter. You can check the current status of your files by running

```
npm run lint
```

Supported lint issues can be automatically fixed by running

```
npx eslint --fix
```

## Formatting

We use Prettier as the frontend formatter. You can check the formatting of the frontend by running

```
npm run format:check
```

and can automatically format the frontend files by running

```
npm run format
```
