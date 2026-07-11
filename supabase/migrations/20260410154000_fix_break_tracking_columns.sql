-- Fix: Add all break tracking columns (both old boolean and new detailed columns)
-- This migration ensures all break-related columns exist

-- First, add the boolean columns if they don't exist (from old migration)
ALTER TABLE public.work_sessions
ADD COLUMN IF NOT EXISTS morning_break BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS lunch_break BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS short_break BOOLEAN DEFAULT FALSE;

-- Then add the detailed tracking columns
ALTER TABLE public.work_sessions
ADD COLUMN IF NOT EXISTS break_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS morning_break_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS morning_break_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS morning_break_duration NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS lunch_break_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS lunch_break_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS lunch_break_duration NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS short_break_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS short_break_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS short_break_duration NUMERIC DEFAULT 0;

-- Add comments
COMMENT ON COLUMN public.work_sessions.break_count IS 'Number of breaks taken today (max 3)';
COMMENT ON COLUMN public.work_sessions.morning_break IS 'Whether employee took morning break (first break)';
COMMENT ON COLUMN public.work_sessions.morning_break_start IS 'Start time of morning break';
COMMENT ON COLUMN public.work_sessions.morning_break_end IS 'End time of morning break';
COMMENT ON COLUMN public.work_sessions.morning_break_duration IS 'Duration of morning break in minutes';
COMMENT ON COLUMN public.work_sessions.lunch_break IS 'Whether employee took lunch break (second break)';
COMMENT ON COLUMN public.work_sessions.lunch_break_start IS 'Start time of lunch break';
COMMENT ON COLUMN public.work_sessions.lunch_break_end IS 'End time of lunch break';
COMMENT ON COLUMN public.work_sessions.lunch_break_duration IS 'Duration of lunch break in minutes';
COMMENT ON COLUMN public.work_sessions.short_break IS 'Whether employee took short/evening break (third break)';
COMMENT ON COLUMN public.work_sessions.short_break_start IS 'Start time of short/evening break';
COMMENT ON COLUMN public.work_sessions.short_break_end IS 'End time of short/evening break';
COMMENT ON COLUMN public.work_sessions.short_break_duration IS 'Duration of short/evening break in minutes';
