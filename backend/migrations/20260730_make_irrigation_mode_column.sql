ALTER TABLE groups
ADD COLUMN irrigation_mode VARCHAR NOT NULL DEFAULT 'auto';

ALTER TABLE groups
ADD CONSTRAINT valid_irrigation_mode
CHECK (irrigation_mode IN ('manual', 'auto'));