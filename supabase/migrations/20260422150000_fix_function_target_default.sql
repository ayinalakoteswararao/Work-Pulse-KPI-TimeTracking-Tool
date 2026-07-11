-- Remove any potential default value of 10 and ensure it defaults to 0
ALTER TABLE public.functions ALTER COLUMN target_value SET DEFAULT 0;
