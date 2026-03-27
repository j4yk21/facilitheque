-- Add new question types for BattleLearn
ALTER TYPE question_type ADD VALUE 'true_false';
ALTER TYPE question_type ADD VALUE 'ordering';
ALTER TYPE question_type ADD VALUE 'matching';
ALTER TYPE question_type ADD VALUE 'fill_blank';
