export type StatusResult = {
  status: string;
  dayType: "ON TIME" | "LATE" | "HALF DAY" | "OUT EARLY" | "IN PROGRESS" | "ABSENT";
  lateMs: number;
  lateText: string;
  workMs: number;
  workText: string;
  overtimeMs: number;
  overtimeText: string;
  remarks: string;
};

const PH_TZ = "Asia/Manila";

export function todayDateKeyPH() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PH_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(new Date())
    .reduce((acc: any, p) => {
      if (p.type !== "literal") acc[p.type] = p.value;
      return acc;
    }, {} as any);

  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function dateKeyAddDays(dateKey: string, deltaDays: number) {
  const m = String(dateKey || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return dateKey;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d, 0, 0, 0));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function getManilaDate(dateKey: string, timeStr: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  const [hour, min, sec] = timeStr.split(":").map(Number);
  const utcMs = Date.UTC(year, month - 1, day, hour, min, sec);
  return new Date(utcMs - 8 * 60 * 60 * 1000);
}

function formatHMS(ms: number) {
  if (ms <= 0) return "-";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h}h ${m}m ${s}s`;
}

export function computeStatus(args: {
  dateKey: string;
  timeIn: Date | null;
  timeOut: Date | null;
  breakIn?: Date | null;
  breakOut?: Date | null;
  scheduleTime?: string | null;
}): StatusResult {
  // 1. Absent case
  if (!args.timeIn) {
    return {
      status: "ABSENT",
      dayType: "ABSENT",
      lateMs: 0,
      lateText: "-",
      workMs: 0,
      workText: "-",
      overtimeMs: 0,
      overtimeText: "-",
      remarks: "Absent (No record)",
    };
  }

  const schedTime = args.scheduleTime || "08:00";
  const targetTimeIn = getManilaDate(args.dateKey, `${schedTime}:00`);
  const targetBreakOut = getManilaDate(args.dateKey, "13:00:00");
  const targetTimeOut = getManilaDate(args.dateKey, "17:00:00");

  // 2. Late Check-In
  let lateInMs = 0;
  if (args.timeIn.getTime() > targetTimeIn.getTime()) {
    lateInMs = args.timeIn.getTime() - targetTimeIn.getTime();
  }

  // 3. Late Break Return (Break Out > 1:00 PM)
  let lateBreakMs = 0;
  if (args.breakOut && args.breakOut.getTime() > targetBreakOut.getTime()) {
    lateBreakMs = args.breakOut.getTime() - targetBreakOut.getTime();
  }

  const lateMs = lateInMs + lateBreakMs;

  // 4. Overtime (Time Out > 5:00 PM)
  let overtimeMs = 0;
  if (args.timeOut && args.timeOut.getTime() > targetTimeOut.getTime()) {
    overtimeMs = args.timeOut.getTime() - targetTimeOut.getTime();
  }

  // 5. Attended Time (Worked duration net of breaks)
  let workMs = 0;
  const finished = !!args.timeOut;

  if (finished) {
    if (args.breakIn && args.breakOut) {
      const breakDuration = args.breakOut.getTime() - args.breakIn.getTime();
      workMs = Math.max(0, (args.timeOut!.getTime() - args.timeIn.getTime()) - breakDuration);
    } else if (args.breakIn) {
      workMs = Math.max(0, args.breakIn.getTime() - args.timeIn.getTime());
    } else {
      workMs = Math.max(0, args.timeOut!.getTime() - args.timeIn.getTime());
    }
  } else {
    // In progress or active
    if (args.breakIn) {
      workMs = Math.max(0, args.breakIn.getTime() - args.timeIn.getTime());
    } else {
      workMs = 0; // Handled as active/in progress
    }
  }

  // 6. Status and Day Type determinations
  const today = todayDateKeyPH();
  const isPastDay = args.dateKey < today;

  let dayType: StatusResult["dayType"] = "ON TIME";
  let isHalfDay = false;

  if (!finished) {
    if (isPastDay) {
      // Past day with no check-out
      isHalfDay = true;
    } else {
      dayType = "IN PROGRESS";
    }
  } else {
    // Has checked out
    if (workMs > 0 && workMs < 5 * 60 * 60 * 1000) {
      isHalfDay = true;
    }
    if (args.timeOut!.getTime() <= getManilaDate(args.dateKey, "13:00:00").getTime()) {
      isHalfDay = true;
    }
  }

  if (isHalfDay) {
    dayType = "HALF DAY";
  } else if (finished) {
    if (args.timeOut!.getTime() < targetTimeOut.getTime()) {
      dayType = "OUT EARLY";
    } else if (lateMs > 0) {
      dayType = "LATE";
    }
  }

  let status = dayType as string;
  if (dayType === "LATE") {
    const minLate = Math.ceil(lateMs / 60000);
    status = `LATE (${minLate} min)`;
  }

  const lateText = lateMs > 0 ? formatHMS(lateMs) : "-";
  const workText = finished ? formatHMS(workMs) : (dayType === "HALF DAY" ? "HALF DAY" : "ACTIVE");
  const overtimeText = overtimeMs > 0 ? formatHMS(overtimeMs) : "-";

  const remarksParts: string[] = [];
  if (lateInMs > 0) remarksParts.push("Late check-in");
  if (lateBreakMs > 0) remarksParts.push("Late break return");
  if (isHalfDay) remarksParts.push("Half day work");
  if (finished && args.timeOut!.getTime() < targetTimeOut.getTime() && !isHalfDay) remarksParts.push("Left early");
  if (overtimeMs > 0) remarksParts.push("With overtime");
  if (finished && remarksParts.length === 0) remarksParts.push("Completed shift");
  if (!finished && !isHalfDay) remarksParts.push("In progress");

  return {
    status,
    dayType,
    lateMs,
    lateText,
    workMs,
    workText,
    overtimeMs,
    overtimeText,
    remarks: remarksParts.join(" • "),
  };
}
