ALTER TABLE sensor
ADD COLUMN name VARCHAR;

ALTER TABLE sensor
ADD COLUMN legacy_cell_id INTEGER;

UPDATE sensor
SET name = sensor_type || ' ' || sensor_id
WHERE name IS NULL;

ALTER TABLE sensor
ALTER COLUMN name SET NOT NULL;

CREATE INDEX ix_sensor_legacy_cell_id
ON sensor (legacy_cell_id);