export interface Course {
  id: string; // "4to"
  name: string; // "4to Año"
  shift: "Mañana" | "Tarde";
  accessPin: string; // 4 digits
}

export interface Student {
  id: string;
  courseId: string;
  firstName: string;
  lastName: string;
  active: boolean;
}

export type AttendanceStatus = "presente" | "ausente" | "tardanza" | "retirado";

export interface AttendanceRecord {
  studentId: string;
  status: AttendanceStatus;
  note?: string; // Optional note / generic note
  reason?: string; // Motivo de la ausencia, tardanza o retirada
  returnsLater?: boolean; // ¿Vuelve más tarde? (para retirados)
  returnTime?: string; // Hora estimada o aclaración de regreso si vuelve más tarde
}

export interface DailyAttendance {
  id?: string; // "{courseId}_{YYYY-MM-DD}"
  courseId: string;
  date: string; // "YYYY-MM-DD"
  updatedAt: number; // timestamp
  records: Record<string, AttendanceRecord>; // Map of studentId -> AttendanceRecord
}

export interface Teacher {
  id: string;
  name: string;
  pin: string; // 4 dígitos para firma personal
  active: boolean;
}

export interface HourlySignature {
  hourIndex: number; // 0, 1, 2, ...
  subject: string;
  signed: boolean;
  teacherId?: string;
  teacherName?: string;
  signedAt?: number; // timestamp
  notes?: string;
}

export interface DailyActa {
  id?: string; // "{courseId}_{YYYY-MM-DD}"
  courseId: string;
  date: string; // "YYYY-MM-DD"
  dayOfWeek: string; // "LUNES", "MARTES", etc.
  signatures: Record<number, HourlySignature>; // hourIndex -> HourlySignature
  updatedAt: number;
}
