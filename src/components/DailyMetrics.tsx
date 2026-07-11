import React from "react";
import { useWorkSession } from "@/hooks/useWorkSession";
import { useAuth } from "@/hooks/useAuth";

export default function DailyMetrics() {
  const auth = useAuth();
  const { workedHoursToday, monthlyLateLogins, lostHoursToday, hourlyRate } = useWorkSession() as any;
  if (!auth || !auth.isEmployee || !auth.isEmployee()) return null;

  const formatHours = (h: number) => {
    const hours = Math.floor(h);
    const minutes = Math.round((h - hours) * 60);
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:00`;
  };

  const lost = Number(lostHoursToday || 0);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="rounded-lg border border-blue-200/70 dark:border-blue-800/50 bg-gradient-to-br from-blue-50 to-blue-100/60 dark:from-blue-900/20 dark:to-blue-800/20 px-3 py-2.5">
          <div className="text-xs font-medium text-blue-700 dark:text-blue-400">Worked Today</div>
          <div className="font-mono text-lg font-semibold text-blue-950 dark:text-blue-100 tabular-nums mt-0.5">
            {formatHours(Number(workedHoursToday || 0))}
          </div>
        </div>
        <div className="rounded-lg border border-amber-200/70 dark:border-amber-800/50 bg-gradient-to-br from-amber-50 to-amber-100/60 dark:from-amber-900/20 dark:to-amber-800/20 px-3 py-2.5">
          <div className="text-xs font-medium text-amber-800 dark:text-amber-400">Late Logins (month)</div>
          <div className="font-mono text-lg font-semibold text-amber-950 dark:text-amber-100 tabular-nums mt-0.5">
            {monthlyLateLogins ?? 0}
          </div>
        </div>
        <div className="rounded-lg border border-rose-200/70 dark:border-rose-800/50 bg-gradient-to-br from-rose-50 to-rose-100/60 dark:from-rose-900/20 dark:to-rose-800/20 px-3 py-2.5">
          <div className="text-xs font-medium text-rose-800 dark:text-rose-400">Loss (hrs / pay) · Timer left</div>
          <div className="font-mono text-lg font-semibold text-rose-950 dark:text-rose-100 tabular-nums mt-0.5">
            {formatHours(lost)}
          </div>
          {hourlyRate != null && hourlyRate > 0 && (
            <div className="text-xs font-medium text-rose-700/90 dark:text-rose-400/90 mt-1">
              Est. pay loss: ${(lost * hourlyRate).toFixed(2)}
            </div>
          )}
        </div>
      </div>
      <div className="mt-3 w-full overflow-x-auto [scrollbar-width:thin]">
        <div className="flex min-w-0 justify-center px-1">
          <div className="shrink-0 rounded-xl border border-indigo-200/90 dark:border-indigo-800/50 bg-gradient-to-br from-indigo-50 via-sky-50 to-cyan-50 dark:from-indigo-900/20 dark:via-sky-900/20 dark:to-cyan-900/20 px-4 py-2.5 text-center shadow-sm ring-1 ring-indigo-100/60 dark:ring-indigo-800/30">
            <p className="whitespace-nowrap text-[11px] sm:text-sm text-indigo-900/85 dark:text-indigo-200/85 flex items-center gap-2">
              <span className="font-semibold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                <span>💸</span> Pay Loss:
              </span>
              <span className="text-sky-900/90 dark:text-sky-200/90 flex items-center gap-1.5">
                <span>📉</span>
                It is calculated based on the missing hours × your hourly rate (if a rate is set).
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
