"use client";

import {
  collection,
  getDocs,
} from "firebase/firestore";

import {
  Rubric,
} from "../data/rubrics";

import {
  db,
} from "./firebase";

export type StoredRubric = Rubric & {
  docId: string;
  source?: "custom" | "base";
};

export async function loadStoredRubrics() {
  const snapshot = await getDocs(collection(db, "rubrics"));

  return snapshot.docs
    .map((rubricDoc) => ({
      docId: rubricDoc.id,
      ...(rubricDoc.data() as Omit<StoredRubric, "docId">),
    }))
    .filter(
      (rubric): rubric is StoredRubric =>
        Boolean(rubric.id) &&
        Boolean(rubric.name) &&
        Boolean(rubric.university) &&
        Boolean(rubric.area) &&
        Array.isArray(rubric.criteria)
    )
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}
