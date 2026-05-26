"use client";

import {
  onAuthStateChanged,
  User,
} from "firebase/auth";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { auth } from "../lib/firebase";
import {
  permissionsForRole,
  resolveUserRole,
} from "../lib/userRoles";

export function useCurrentUserPermissions() {
  const [user, setUser] =
    useState<User | null>(auth.currentUser);

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(auth, setUser);

    return () => unsubscribe();
  }, []);

  const role = resolveUserRole(user);
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
