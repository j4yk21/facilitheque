-- Add new question types for BattleLearn
-- IF NOT EXISTS: this migration may or may not have been applied to the
-- remote database during the 00002-version conflict (see README, section
-- "Base de données") — idempotence makes the history repair safe.
ALTER TYPE question_type ADD VALUE IF NOT EXISTS 'true_false';
ALTER TYPE question_type ADD VALUE IF NOT EXISTS 'ordering';
ALTER TYPE question_type ADD VALUE IF NOT EXISTS 'matching';
ALTER TYPE question_type ADD VALUE IF NOT EXISTS 'fill_blank';
