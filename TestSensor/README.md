# Test Sensor

A small FastAPI service that simulates a numeric sensor for NodeFlow.

The initial mode is configured with `INITIAL_SENSOR_MODE`. Updating `/reading`
sets a fixed value and returns the service to manual mode. Sine mode generates
values between the configured minimum and maximum over the configured period.

## Endpoints

- `GET /health`
- `GET /reading`
- `PUT /reading`
- `PUT /mode`
- `GET /simulation`
- `PUT /simulation`
