"use client";

import {
  collection,
  getDocs,
} from "firebase/firestore";
import {
  useEffect,
  useState,
} from "react";

import { db } from "../lib/firebase";
import {
  TeacherProfile,
  teacherProfileOptions,
} from "../lib/tutors";
import { normalizeEmail } from "../lib/userRoles";

export function useTeacherProfiles() {
  const [profiles, setProfiles] =
    useState<TeacherProfile[]>(teacherProfileOptions());

  useEffect(() => {
    let active = true;

    async function loadTeachers() {
      try {
        const snapshot =
          await getDocs(collection(db, "userAccess"));
        const remoteProfiles = snapshot.docs
          .map((accessDoc) => {
            const data = accessDoc.data();
            const email = normalizeEmail(data.email || accessDoc.id);

            return data.role === "teacher" && email
              ? {
                  email,
                  label: data.name || email,
                }
              : null;
          })
          .filter(
            (profile): profile is TeacherProfile =>
              profile !== null
          );
        const mergedProfiles = [
          ...teacherProfileOptions(),
          ...remoteProfiles,
        ];
        const uniqueProfiles = Array.from(
          new Map(
            mergedProfiles.map((profile) => [
              profile.email,
              profile,
            ])
          ).values()
        ).sort((a, b) =>
          a.label.localeCompare(b.label, "es")
        );

        if (active) {
          setProfiles(uniqueProfiles);
        }
      } catch (error) {
        console.error(error);
      }
    }

    void loadTeachers();

    return () => {
      active = false;
    };
  }, []);

  return profiles;
}
