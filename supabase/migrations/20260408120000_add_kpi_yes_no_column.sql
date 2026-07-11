-- Add is_yes_no column to kpis table for Yes/No type KPIs
ALTER TABLE public.kpis
ADD COLUMN IF NOT EXISTS is_yes_no BOOLEAN DEFAULT false;

-- Add comment explaining the column
COMMENT ON COLUMN public.kpis.is_yes_no IS 'Whether this KPI is a Yes/No type (boolean) instead of numeric';
