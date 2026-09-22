"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { DailyAttendance } from "../../types";

export function useAttendance(courseId: string, date: string) {
  const [attendance, setAttendance] = useState<DailyAttendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!courseId || !date) {
      setLoading(false);
      return;
    }

    const docId = `${courseId}_${date}`;
    const docRef = doc(db, "daily_attendance", docId);

    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setAttendance({ id: docSnap.id, ...docSnap.data() } as DailyAttendance);
        } else {
          setAttendance(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching attendance real-time:", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [courseId, date]);

  return { attendance, loading, error };
}
