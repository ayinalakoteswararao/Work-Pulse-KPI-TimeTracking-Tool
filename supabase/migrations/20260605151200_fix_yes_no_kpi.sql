-- Migration to fix the specific KPI to be a Yes/No type instead of a Count type
UPDATE public.kpis
SET is_yes_no = true
WHERE function_id IN (
  SELECT id FROM public.functions 
  WHERE function_name ILIKE '%Was the local build and unit testing successful before push?%'
);
