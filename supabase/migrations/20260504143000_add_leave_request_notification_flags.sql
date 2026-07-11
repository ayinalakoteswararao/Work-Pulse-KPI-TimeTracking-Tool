ALTER TABLE public.leave_requests
ADD COLUMN IF NOT EXISTS admin_seen BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS employee_seen BOOLEAN NOT NULL DEFAULT true;

-- Existing pending requests should appear as unseen for admin.
UPDATE public.leave_requests
SET admin_seen = false
WHERE status = 'pending';

-- Existing reviewed requests should appear as seen for employees initially.
UPDATE public.leave_requests
SET employee_seen = true
WHERE status IN ('approved', 'rejected');

CREATE INDEX IF NOT EXISTS idx_leave_requests_admin_unseen_pending
  ON public.leave_requests (status, admin_seen, created_at DESC)
  WHERE status = 'pending' AND admin_seen = false;

CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_unseen
  ON public.leave_requests (employee_id, employee_seen, reviewed_at DESC)
  WHERE status IN ('approved', 'rejected') AND employee_seen = false;
