export interface Course {
  id: string; // "4to-a"
  name: string; // "4to Año 'A'"
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
  note?: string; // Optional note
}

export interface DailyAttendance {
  id?: string; // "{courseId}_{YYYY-MM-DD}"
  courseId: string;
  date: string; // "YYYY-MM-DD"
  updatedAt: number; // timestamp
  records: Record<string, AttendanceRecord>; // Map of studentId -> AttendanceRecord
}
