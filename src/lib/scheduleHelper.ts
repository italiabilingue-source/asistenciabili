import schedulesData from "./courseSchedules.json";

export interface CourseScheduleMap {
  [courseSlug: string]: {
    courseName: string;
    days: {
      [dayName: string]: string[];
    };
  };
}

const schedules = schedulesData as CourseScheduleMap;

export const DAYS_OF_WEEK = ["DOMINGO", "LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO"];

export const DEFAULT_MODULE_TIMES = [
  { label: "1ª Hora", time: "07:15 - 07:55" },
  { label: "2ª Hora", time: "07:55 - 08:35" },
  { label: "3ª Hora", time: "08:45 - 09:25" },
  { label: "4ª Hora", time: "09:25 - 10:05" },
  { label: "5ª Hora", time: "10:15 - 10:55" },
  { label: "6ª Hora", time: "10:55 - 11:35" },
  { label: "7ª Hora", time: "11:45 - 12:25" },
  { label: "8ª Hora", time: "12:25 - 13:05" },
  { label: "9ª Hora", time: "13:10 - 13:50" },
  { label: "10ª Hora", time: "13:50 - 14:30" }
];

export function getDayOfWeekFromDate(dateStr: string): string {
  // dateStr is YYYY-MM-DD
  const [year, month, day] = dateStr.split("-").map(Number);
  const dateObj = new Date(year, month - 1, day);
  return DAYS_OF_WEEK[dateObj.getDay()] || "LUNES";
}

export function getSubjectsForCourseAndDate(courseSlug: string, dateStr: string): string[] {
  const dayName = getDayOfWeekFromDate(dateStr);
  const courseData = schedules[courseSlug];
  
  if (!courseData || !courseData.days) {
    return [];
  }

  return courseData.days[dayName] || [];
}
