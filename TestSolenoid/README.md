# Test Solenoid

A small FastAPI service that simulates an open or closed solenoid for NodeFlow.

The initial state is configured with `INITIAL_SOLENOID_STATE`. Updating
`/status` sets the state directly, while `/open` and `/close` provide explicit
commands that behave like operations sent to a real solenoid.

## Endpoints

- `GET /health`
- `GET /status`
- `PUT /status`
- `POST /open`
- `POST /close`
