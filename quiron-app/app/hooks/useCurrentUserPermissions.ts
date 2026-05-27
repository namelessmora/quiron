"use client";

import {
  onAuthStateChanged,
  User,
} from "firebase/auth";
import {
  doc,
  getDoc,
} from "firebase/firestore";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { auth, db } from "../lib/firebase";
import {
  normalizeEmail,
  permissionsForRole,
  resolveUserRole,
} from "../lib/userRoles";
import { UserRole } from "../data/userRoles";

export function useCurrentUserPermissions() {
  const [user, setUser] =
    useState<User | null>(auth.currentUser);
  const [remoteRole, setRemoteRole] =
    useState<UserRole | null>(null);
  const [roleLoaded, setRoleLoaded] =
    useState(false);

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(auth, setUser);

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let active = true;

    async function loadRemoteRole() {
      const email = normalizeEmail(user?.email);

      if (!email) {
        setRemoteRole(null);
        setRoleLoaded(true);
        return;
      }

      try {
        setRoleLoaded(false);
        const accessDoc = await getDoc(
          doc(db, "userAccess", email)
        );
        const role = accessDoc.data()?.role;

        if (
          active &&
          (role === "admin" ||
            role === "teacher" ||
            role === "student")
        ) {
          setRemoteRole(role);
          setRoleLoaded(true);
          return;
        }
      } catch (error) {
        console.error(error);
      }

      if (active) {
        setRemoteRole(null);
        setRoleLoaded(true);
      }
    }

    void loadRemoteRole();

    return () => {
      active = false;
    };
  }, [user?.email]);

  const role = remoteRole || (roleLoaded ? "student" : resolveUserRole(user));
  const permissions = useMemo(
    () => permissionsForRole(role),
    [role]
  );

  return {
    user,
    role,
    permissions,
  };
}
