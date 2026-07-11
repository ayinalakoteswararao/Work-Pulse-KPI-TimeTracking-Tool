-- Add target_count_display column to store original range strings (e.g. '150-200')
ALTER TABLE public.kpis ADD COLUMN target_count_display text;
