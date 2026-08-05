CREATE TABLE sensor_readings (
    id SERIAL PRIMARY KEY,
    sensor_uuid UUID NOT NULL,
    user_id UUID NOT NULL,
    measurement VARCHAR NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    unit VARCHAR,
    timestamp TIMESTAMPTZ NOT NULL
);

CREATE INDEX ix_sensor_readings_sensor_uuid
ON sensor_readings (sensor_uuid);

CREATE INDEX ix_sensor_readings_user_id
ON sensor_readings (user_id);

CREATE INDEX ix_sensor_readings_measurement
ON sensor_readings (measurement);

CREATE INDEX ix_sensor_readings_timestamp
ON sensor_readings (timestamp);

CREATE INDEX ix_sensor_readings_series_time
ON sensor_readings (sensor_uuid, measurement, timestamp);
