import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  IndianRupee,
  Info,
  MinusCircle,
  TrendingUp,
  WalletCards,
} from "lucide-react";

type SalarySummaryCardProps = {
  dateLabel: string;
  monthlySalary?: number | null;
  workingDays?: number | null;
  standardHoursPerDay?: number | null;
  workedHours?: number;
  attendanceType?: string | null;
  attendanceApproved?: boolean;
  isHoliday?: boolean;
  isHolidayPaid?: boolean;
  readOnly?: boolean;
  hasLoggedKPIToday?: boolean;
  accumulatedMonthDeductions?: number;
};

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

/** Bank-style masked INR line when salary is hidden */
function MaskedRupee({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "tabular-nums tracking-[0.15em] select-none text-gray-400",
        className
      )}
      aria-hidden
    >
      ₹ ••••••••
    </span>
  );
}

export default function SalarySummaryCard({
  dateLabel,
  monthlySalary,
  workingDays,
  standardHoursPerDay,
  workedHours = 0,
  attendanceType,
  attendanceApproved = false,
  isHoliday = false,
  isHolidayPaid = false,
  readOnly = false,
  hasLoggedKPIToday = true,
  accumulatedMonthDeductions = 0,
}: SalarySummaryCardProps) {
  const [salaryVisible, setSalaryVisible] = useState(false);

  const wd = workingDays && workingDays > 0 ? workingDays : 30;
  const stdHours = standardHoursPerDay && standardHoursPerDay > 0 ? standardHoursPerDay : 8;
  const hasSalary = typeof monthlySalary === "number" && Number.isFinite(monthlySalary) && monthlySalary > 0;
  const perDaySalary = hasSalary ? monthlySalary / wd : 0;
  const hourlyRate = hasSalary ? monthlySalary / (wd * stdHours) : 0;
  const safeWorkedHours = clamp(workedHours, 0, stdHours);

  const getMultiplierByAttendance = () => {
    if (isHoliday) return isHolidayPaid ? 1 : 0;
    if (!attendanceType) return safeWorkedHours / stdHours;
    switch (attendanceType) {
      case "full_day":
      case "leave_paid":
      case "half_day_paid":
      case "holiday_paid":
        return 1;
      case "half_day_unpaid":
        return 0;
      case "leave_unpaid":
      case "holiday_unpaid":
        return 0;
      default:
        return safeWorkedHours / stdHours;
    }
  };

  const getDeductionReason = () => {
    if (deduction === null || deduction <= 0) return null;
    
    if (isHoliday) {
      return isHolidayPaid ? null : "Unpaid holiday - no pay today";
    }
    
    if (attendanceType) {
      switch (attendanceType) {
        case "leave_paid":
          return null; // No deduction for paid leave
        case "leave_unpaid":
          return "Unpaid leave - full day deduction";
        case "half_day_paid":
          return null; // No deduction for paid half day
        case "half_day_unpaid":
          return "Unpaid half day - full day deduction";
        case "holiday_paid":
          return null; // No deduction for paid holiday
        case "holiday_unpaid":
          return "Unpaid holiday - full day deduction";
        default:
          return null;
      }
    }
    
    // Check if KPIs are missing first since that causes a 100% deduction after hours
    const currentHour = new Date().getHours();
    const workStartHour = 10;
    const workEndHour = 19;
    
    if (!hasLoggedKPIToday && currentHour >= workEndHour) {
      return "No tasks/KPIs logged today";
    }

    // If no attendance type and worked hours are less than standard
    if (safeWorkedHours < stdHours) {
      if (safeWorkedHours === 0) {
        // Only show "No work session" if it's actually early in the day and work hasn't started
        // or if the worked hours are genuinely 0 due to no session
        
        // If it's before work hours or very early in the day, don't penalize
        if (currentHour < workStartHour) {
          return "Work day hasn't started yet";
        }
        
        // If it's during work hours but worked hours are 0, check if there might be a data issue
        if (currentHour >= workStartHour && currentHour < workEndHour) {
          return "Work session in progress or data pending";
        }
        
        // Only after work hours should we consider it a "no work session" scenario
        if (currentHour >= workEndHour) {
          return "No work session recorded today";
        }
        
        return "Work session data pending";
      } else {
        return `Incomplete work hours - worked ${safeWorkedHours.toFixed(1)}h of ${stdHours}h`;
      }
    }
    
    return null;
  };

  const hasManualAttendance = !!attendanceType;
  const attendanceApplied = hasManualAttendance ? attendanceApproved : true;
  
  // Check if it's during work hours to avoid premature deductions
  const currentHour = new Date().getHours();
  const workStartHour = 10;
  const workEndHour = 19;
  const isDuringWorkHours = currentHour >= workStartHour && currentHour < workEndHour;
  
  // Calculate multiplier with special handling for work-in-progress scenarios
  let multiplier = attendanceApplied ? getMultiplierByAttendance() : safeWorkedHours / stdHours;
  
  // If no manual attendance, worked hours are 0, and it's during work hours, assume full day potential
  if (!hasManualAttendance && safeWorkedHours === 0 && isDuringWorkHours) {
    multiplier = 1; // Assume full day potential during work hours
  }
  
  // Check if KPIs are missing (after hours) -> force multiplier to 0
  if (!hasLoggedKPIToday && !isDuringWorkHours && currentHour >= workEndHour) {
    multiplier = 0;
  }
  
  const finalEarned = hasSalary ? Math.max(0, perDaySalary * multiplier) : null;
  const deduction = hasSalary ? Math.max(0, perDaySalary - (finalEarned || 0)) : null;
  
  // The estimated month-end salary is the full monthly salary minus all past deductions and today's deduction
  const estimatedMonthEndSalary =
    hasSalary ? Math.max(0, monthlySalary! - accumulatedMonthDeductions - (deduction || 0)) : null;
  const deductionPctOfMonthly =
    hasSalary && monthlySalary! > 0 && deduction != null && deduction > 0
      ? (deduction / monthlySalary!) * 100
      : null;
  const deductionPctOfDayShare =
    hasSalary && perDaySalary > 0 && deduction != null && deduction > 0
      ? (deduction / perDaySalary) * 100
      : null;

  const reasons: string[] = [];
  if (isHoliday) {
    reasons.push(isHolidayPaid ? "Paid Holiday" : "Unpaid Holiday");
  }
  if (attendanceType) {
    const readable = attendanceType.replace(/_/g, " ");
    reasons.push(`${readable}${attendanceApproved ? " (approved)" : " (pending approval)"}`);
  }

  const badgeTone =
    hasSalary && (finalEarned || 0) >= perDaySalary ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700";

  return (
    <Card className="overflow-hidden border border-slate-200/80 bg-white shadow-sm">
      <CardHeader className="border-b border-slate-100 bg-gradient-to-br from-white to-slate-50/70 pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <span className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <IndianRupee className="h-4 w-4 text-white" />
            </span>
            Pay snapshot (today)
          </CardTitle>
          <div className="flex items-center gap-2 shrink-0">
            {hasSalary && !readOnly && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full text-gray-600 hover:bg-slate-100 hover:text-gray-900"
                onClick={() => setSalaryVisible((v) => !v)}
                aria-label={salaryVisible ? "Hide salary amounts" : "Show salary amounts"}
                aria-pressed={salaryVisible}
              >
                {salaryVisible ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            )}
          <Badge className={cn("rounded-full border-0 px-2.5", badgeTone)}>
            {attendanceApplied ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Applied
              </>
            ) : (
              <>
                <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Pending approval
              </>
            )}
          </Badge>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <p className="text-sm text-gray-500">{dateLabel}</p>
          <span className="text-gray-300">·</span>
          <p className="text-sm text-gray-600">
            Monthly:{" "}
            {hasSalary ? (
              salaryVisible ? (
                <span className="font-semibold text-gray-900 tabular-nums">
                  {inr.format(Math.round(monthlySalary!))}
                </span>
              ) : (
                <MaskedRupee className="font-semibold" />
              )
            ) : (
              <span className="font-semibold text-gray-900">—</span>
            )}
          </p>
          {hasSalary && (
            <>
              <span className="text-gray-300">·</span>
              <p className="text-gray-600">
                Month-end:{" "}
                {salaryVisible ? (
                  <span className="font-semibold text-indigo-700 tabular-nums">
                    {estimatedMonthEndSalary != null
                      ? inr.format(Math.round(estimatedMonthEndSalary))
                      : "—"}
                  </span>
                ) : (
                  <MaskedRupee className="font-semibold text-indigo-700" />
                )}
              </p>
            </>
          )}
          <span className="text-gray-300">·</span>
          <p className="text-sm text-gray-600">
            Working days:{" "}
            <span className="font-semibold text-gray-900 tabular-nums">{wd}</span>
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-4 sm:p-5">
        {hasSalary && (
          <div className="rounded-xl border border-indigo-100/80 bg-gradient-to-br from-indigo-50/60 to-white p-4 shadow-sm space-y-3">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
              <div className="text-sm text-gray-700 space-y-2 min-w-0">
                <p>
                  <span className="text-gray-500">Monthly salary (basis):</span>{" "}
                  {salaryVisible ? (
                    <span className="font-semibold text-gray-900 tabular-nums">
                      {inr.format(Math.round(monthlySalary!))}
                    </span>
                  ) : (
                    <MaskedRupee className="font-semibold inline" />
                  )}
                </p>
                <p>
                  <span className="text-gray-500">One day&apos;s share</span>{" "}
                  <span className="text-gray-400">(monthly ÷ {wd} working days):</span>{" "}
                  {salaryVisible ? (
                    <span className="font-semibold text-indigo-900 tabular-nums">
                      {inr.format(Math.round(perDaySalary))}
                    </span>
                  ) : (
                    <MaskedRupee className="font-semibold text-indigo-900/80 inline" />
                  )}
                </p>
                <div className="pt-1 border-t border-indigo-100/80">
                  <p className="font-medium text-gray-900">
                    Estimated earning today:{" "}
                    {salaryVisible ? (
                      <span className="text-emerald-700 tabular-nums">
                        {finalEarned != null ? inr.format(Math.round(finalEarned)) : "—"}
                      </span>
                    ) : (
                      <MaskedRupee className="text-emerald-700 inline" />
                    )}
                  </p>
                  {deduction != null && deduction > 0 ? (
                    <div className="mt-2">
                      <p className="text-rose-800 font-medium">
                        Deducted today (vs one-day share):{" "}
                        {salaryVisible ? (
                          <span className="tabular-nums">{inr.format(Math.round(deduction))}</span>
                        ) : (
                          <MaskedRupee className="text-rose-600 inline" />
                        )}
                      </p>
                      {getDeductionReason() && (
                        <p className="mt-1 text-xs text-rose-600 bg-rose-50 px-2 py-1 rounded-md">
                          <span className="font-medium">Reason:</span> {getDeductionReason()}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="mt-2 text-emerald-800 text-sm">
                      No deduction today — estimated pay matches your approved one-day share for the hours or attendance rules applied.
                    </p>
                  )}
                  {deduction != null && deduction > 0 && (
                    <ul className="mt-2 text-xs text-gray-600 space-y-1 list-disc list-inside">
                      {deductionPctOfMonthly != null && (
                        <li>
                          About <span className="font-semibold tabular-nums">{deductionPctOfMonthly.toFixed(2)}%</span>{" "}
                          of your <span className="font-medium">monthly</span> salary
                        </li>
                      )}
                      {deductionPctOfDayShare != null && (
                        <li>
                          About <span className="font-semibold tabular-nums">{deductionPctOfDayShare.toFixed(0)}%</span>{" "}
                          of <span className="font-medium">today&apos;s</span> full-day amount (the ₹ one-day slice above)
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100/60 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium text-slate-600">Hourly rate</div>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm">
                <Clock3 className="h-3.5 w-3.5" />
              </span>
            </div>
            <div className="mt-1 text-lg font-bold text-gray-900 tabular-nums">
              {hasSalary ? (
                salaryVisible ? (
                  inr.format(Math.round(hourlyRate))
                ) : (
                  <MaskedRupee className="text-lg font-bold text-gray-500" />
                )
              ) : (
                "—"
              )}
            </div>
            {!hasSalary && (
              <div className="mt-1 text-[11px] text-gray-500">
                Monthly salary not set yet
              </div>
            )}
          </div>

          <div className="rounded-xl border border-rose-200 bg-gradient-to-br from-rose-50 to-rose-100/40 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium text-rose-700">Deduction (today)</div>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-rose-700 shadow-sm">
                <MinusCircle className="h-3.5 w-3.5" />
              </span>
            </div>
            <div className="mt-1 text-lg font-bold text-rose-800 tabular-nums">
              {deduction === null
                ? "—"
                : salaryVisible
                  ? inr.format(Math.round(deduction))
                  : <MaskedRupee className="text-lg font-bold text-rose-400/90" />}
            </div>
            <div className="mt-1 text-[11px] text-rose-700/80">
              Worked: <span className="font-semibold tabular-nums">{safeWorkedHours.toFixed(2)}h</span> / {stdHours}h
            </div>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/40 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium text-emerald-700">Final earned</div>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-emerald-700 shadow-sm">
                <TrendingUp className="h-3.5 w-3.5" />
              </span>
            </div>
            <div className="mt-1 text-lg font-bold text-emerald-800 tabular-nums">
              {finalEarned === null
                ? "—"
                : salaryVisible
                  ? inr.format(Math.round(finalEarned))
                  : <MaskedRupee className="text-lg font-bold text-emerald-600/80" />}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <WalletCards className="h-4 w-4 text-slate-500" />
              Policy / context
            </div>
            <div className="text-xs text-gray-400">
              Hour-based pay · Std hours/day {stdHours}
            </div>
          </div>

          {reasons.length === 0 ? (
            <div className="mt-3 text-sm text-gray-600">
              Regular hour-based calculation is applied.
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {reasons.map((r, idx) => (
                <div
                  key={`${r}-${idx}`}
                  className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2"
                >
                  <span className="text-sm text-gray-800 truncate">{r}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

