import type { WorkSession } from "@/hooks/useWorkSession";

/** Planned durations (minutes) for each break type — matches policy 15m / 30m / 15m */
export const BREAK_ALLOCATED_MINUTES = {
  morning: 15,
  lunch: 30,
  short: 15,
} as const;

export const BREAK_ENDING_SOON_MESSAGE =
  "👉 ⏰ Your break is about to end in 2 minutes. Please get ready to resume work.";

export type ActiveBreakKind = "morning" | "lunch" | "short";

export function getActiveBreakReminderInfo(
  session: WorkSession | null
): { kind: ActiveBreakKind; start: Date; startIso: string; allocatedMinutes: number } | null {
  if (!session || session.status !== "on_break") return null;

  if (session.morning_break_start && !session.morning_break_end) {
    return {
      kind: "morning",
      start: new Date(session.morning_break_start),
      startIso: session.morning_break_start,
      allocatedMinutes: BREAK_ALLOCATED_MINUTES.morning,
    };
  }
  if (session.lunch_break_start && !session.lunch_break_end) {
    return {
      kind: "lunch",
      start: new Date(session.lunch_break_start),
      startIso: session.lunch_break_start,
      allocatedMinutes: BREAK_ALLOCATED_MINUTES.lunch,
    };
  }
  if (session.short_break_start && !session.short_break_end) {
    return {
      kind: "short",
      start: new Date(session.short_break_start),
      startIso: session.short_break_start,
      allocatedMinutes: BREAK_ALLOCATED_MINUTES.short,
    };
  }

  // Legacy single break column
  if (session.break_start_time && !session.break_end_time) {
    return {
      kind: "morning",
      start: new Date(session.break_start_time),
      startIso: session.break_start_time,
      allocatedMinutes: BREAK_ALLOCATED_MINUTES.morning,
    };
  }

  return null;
}

/** Timestamp when the "2 minutes before end" reminder should fire */
export function getBreakReminderAtMs(
  breakStart: Date,
  allocatedMinutes: number,
  leadMinutes = 2
): number {
  const endMs = breakStart.getTime() + allocatedMinutes * 60 * 1000;
  const reminderMs = endMs - leadMinutes * 60 * 1000;
  // If the break is not long enough for a full lead window, fire at break start
  return Math.max(breakStart.getTime(), reminderMs);
}

let activeAudioContext: AudioContext | null = null;

export function stopBreakEndingSoonSound(): void {
  if (activeAudioContext) {
    try {
      void activeAudioContext.close();
    } catch {
      // ignore
    }
    activeAudioContext = null;
  }
}

/** Short notification chime (no external asset; works after user interaction with the page) */
export function playBreakEndingSoonSound(): void {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;

    // Stop any existing context first
    stopBreakEndingSoonSound();

    const ctx = new Ctx();
    activeAudioContext = ctx;

    const beep = (startTime: number, freq: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.12, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.25);
    };

    const run = () => {
      // Schedule beeps for 60 seconds (1 minute continuously)
      const durationSeconds = 60;
      for (let i = 0; i < durationSeconds; i++) {
        const t0 = ctx.currentTime + 0.05 + (i * 1.0); // play one pair of beeps every 1 second
        beep(t0, 880);
        beep(t0 + 0.35, 660);
      }
    };

    void ctx.resume().then(run).catch(run);
  } catch {
    // ignore
  }
}
