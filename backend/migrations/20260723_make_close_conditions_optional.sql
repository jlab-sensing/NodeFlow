ALTER TABLE activation_prefs
    ALTER COLUMN close_condition_operator DROP NOT NULL,
    ALTER COLUMN close_condition_value DROP NOT NULL;
