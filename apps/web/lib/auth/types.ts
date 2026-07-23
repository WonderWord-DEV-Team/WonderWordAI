export const USER_ROLES = ["CHILD", "PARENT"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export type AuthContext = {
  email: string;
  role: UserRole;
};

export function parseUserRole(value: unknown): UserRole | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.toUpperCase();

  return USER_ROLES.includes(normalized as UserRole) ? (normalized as UserRole) : null;
}

export function getRoleHome(role: UserRole) {
  return role === "PARENT" ? "/parent/dashboard" : "/child/demo-session/read";
}
