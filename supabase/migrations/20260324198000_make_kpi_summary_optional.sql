-- Make kpi_summary optional in kpis table since employees will fill it during KPI updates
ALTER TABLE public.kpis 
ALTER COLUMN kpi_summary DROP NOT NULL;

-- Update existing KPIs to have null summary if they're empty
UPDATE public.kpis 
SET kpi_summary = NULL 
WHERE kpi_summary = '' OR kpi_summary IS NULL;
