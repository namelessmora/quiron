import {
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "./firebase";
import { normalizeEmail } from "./userRoles";

type AuditDetails = Record<
  string,
  string | number | boolean | null | undefined
>;

export async function writeAuditLog({
  action,
  actorEmail,
  targetType,
  targetId,
  targetName,
  details = {},
}: {
  action: string;
  actorEmail?: string | null;
  targetType: string;
  targetId?: string;
  targetName?: string;
  details?: AuditDetails;
}) {
  try {
    await addDoc(collection(db, "auditLogs"), {
      action,
      actorEmail: normalizeEmail(actorEmail),
      targetType,
      targetId: targetId || "",
      targetName: targetName || "",
      details,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error(error);
  }
}
