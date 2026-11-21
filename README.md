# ![NodeFlow](.github/assets/img/NodeFlowPNG.png)
Low Cost, Real-Time Automated Irrigation

## Dependencies
| Dependency |
| ---------- |
| Python     |
| Docker     |


## Getting Started

### Local Development (with Hot Reloading)
```bash
cp .env.example .env
docker compose up --build -d
```
The frontend is available at <http://localhost:3001> with live hot module reloading (HMR), and the backend is at <http://localhost:8001>.

### Production (Nginx Reverse Proxy with SSL)
```bash
docker compose -f docker-compose.production.yaml up --build -d
```
The web server runs behind Nginx with SSL enabled at <https://localhost> (or your configured `SERVER_NAME`), serving optimized static files natively and proxying backend APIs. For SSL certificate configuration and options, see the [Nginx README](nginx/README.md).


## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for Python 3.11 environment setup, backend
Ruff formatting and linting, backend tests, frontend checks, and the merge queue
workflow. Backend quality dependencies are separate from runtime dependencies.

## Builders

- David Glover [dvdthr5](https://github.com/dvdthr5)

- John Madden [jmadden173](https://github.com/jmadden173)
