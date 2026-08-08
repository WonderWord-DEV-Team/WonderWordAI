import type { AuthContext, UserRole } from "@/lib/auth/types";
import type { ReadingSession, ReadingSessionRow } from "@/lib/sessions/api";

export const E2E_AUTH_COOKIE = "ww_e2e_auth";
export const E2E_AUTH_SECRET = "local-e2e-only";

type CookieReader = {
  get(name: string): { value: string } | undefined;
};

type E2eAuthAccount = {
  authId: string;
  email: string;
  expired?: boolean;
};

export type E2eAppUser = {
  id: string;
  authId: string;
  email: string;
  role: UserRole;
  name: string;
};

export type E2eAuthState =
  | { status: "unauthenticated" }
  | { status: "invalid-role" }
  | { status: "authenticated"; account: E2eAuthAccount; appUser: E2eAppUser };

export const e2eIds = {
  parentOne: "10000000-0000-4000-8000-000000000001",
  childOne: "20000000-0000-4000-8000-000000000001",
  parentTwo: "10000000-0000-4000-8000-000000000002",
  childTwo: "20000000-0000-4000-8000-000000000002",
  openSession: "40000000-0000-4000-8000-000000000001",
  closedSession: "40000000-0000-4000-8000-000000000002",
  otherChildSession: "40000000-0000-4000-8000-000000000003"
} as const;

export const e2eAuthIds = {
  parentOne: "e2e-auth-parent-one",
  childOne: "e2e-auth-child-one",
  parentTwo: "e2e-auth-parent-two",
  childTwo: "e2e-auth-child-two",
  missingProfile: "e2e-auth-missing-profile",
  expired: "e2e-auth-expired"
} as const;

const authAccounts: E2eAuthAccount[] = [
  { authId: e2eAuthIds.parentOne, email: "parent.one@example.test" },
  { authId: e2eAuthIds.childOne, email: "child.one@example.test" },
  { authId: e2eAuthIds.parentTwo, email: "parent.two@example.test" },
  { authId: e2eAuthIds.childTwo, email: "child.two@example.test" },
  { authId: e2eAuthIds.missingProfile, email: "missing.profile@example.test" },
  { authId: e2eAuthIds.expired, email: "expired@example.test", expired: true }
];

const appUsers: E2eAppUser[] = [
  {
    id: e2eIds.parentOne,
    authId: e2eAuthIds.parentOne,
    email: "parent.one@example.test",
    role: "PARENT",
    name: "E2E Parent One"
  },
  {
    id: e2eIds.childOne,
    authId: e2eAuthIds.childOne,
    email: "child.one@example.test",
    role: "CHILD",
    name: "E2E Child One"
  },
  {
    id: e2eIds.parentTwo,
    authId: e2eAuthIds.parentTwo,
    email: "parent.two@example.test",
    role: "PARENT",
    name: "E2E Parent Two"
  },
  {
    id: e2eIds.childTwo,
    authId: e2eAuthIds.childTwo,
    email: "child.two@example.test",
    role: "CHILD",
    name: "E2E Child Two"
  }
];

const parentChild = [
  { parentId: e2eIds.parentOne, childId: e2eIds.childOne },
  { parentId: e2eIds.parentTwo, childId: e2eIds.childTwo }
];

const initialSessions: ReadingSessionRow[] = [
  {
    id: e2eIds.openSession,
    child_id: e2eIds.childOne,
    start_time: "2026-08-08T10:00:00.000Z",
    end_time: null,
    total_words: 24,
    correct_words: 22,
    created_at: "2026-08-08T10:00:00.000Z"
  },
  {
    id: e2eIds.closedSession,
    child_id: e2eIds.childOne,
    start_time: "2026-08-07T10:00:00.000Z",
    end_time: "2026-08-07T10:10:00.000Z",
    total_words: 18,
    correct_words: 16,
    created_at: "2026-08-07T10:00:00.000Z"
  },
  {
    id: e2eIds.otherChildSession,
    child_id: e2eIds.childTwo,
    start_time: "2026-08-08T11:00:00.000Z",
    end_time: null,
    total_words: 30,
    correct_words: 29,
    created_at: "2026-08-08T11:00:00.000Z"
  }
];

type E2eStore = {
  sessions: ReadingSessionRow[];
  createdSessionCount: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __wonderwordE2eStore: E2eStore | undefined;
}

export function isE2eMode() {
  return (
    process.env.WONDERWORD_E2E === "1" &&
    process.env.NODE_ENV !== "production" &&
    process.env.WONDERWORD_E2E_AUTH_SECRET === E2E_AUTH_SECRET
  );
}

export function makeE2eAuthCookie(authId: string) {
  return `${E2E_AUTH_SECRET}:${authId}`;
}

export function getE2eAuthState(cookies: CookieReader): E2eAuthState {
  if (!isE2eMode()) {
    return { status: "unauthenticated" };
  }

  const rawCookie = cookies.get(E2E_AUTH_COOKIE)?.value;
  if (!rawCookie) {
    return { status: "unauthenticated" };
  }

  const [secret, authId] = rawCookie.split(":");
  if (secret !== E2E_AUTH_SECRET || !authId) {
    return { status: "unauthenticated" };
  }

  const account = authAccounts.find((candidate) => candidate.authId === authId);
  if (!account || account.expired) {
    return { status: "unauthenticated" };
  }

  const appUser = appUsers.find((candidate) => candidate.authId === authId);
  if (!appUser) {
    return { status: "invalid-role" };
  }

  return { status: "authenticated", account, appUser };
}

export function getE2eAuthContext(auth: E2eAuthState): AuthContext | null {
  if (auth.status !== "authenticated") {
    return null;
  }

  return {
    email: auth.account.email,
    role: auth.appUser.role
  };
}

export function getE2eUserById(id: string) {
  return appUsers.find((user) => user.id === id) ?? null;
}

export function getE2eChildProfile(childId: string) {
  const user = getE2eUserById(childId);
  return user?.role === "CHILD" ? { child_id: user.id, name: user.name, grade: 2 } : null;
}

export function getE2eLinkedChildIds(parentId: string) {
  return parentChild.filter((link) => link.parentId === parentId).map((link) => link.childId);
}

export function getE2eSiblingProfiles(childId: string) {
  const parent = parentChild.find((link) => link.childId === childId)?.parentId;
  if (!parent) {
    return [];
  }

  return getE2eLinkedChildIds(parent)
    .filter((id) => id !== childId)
    .map(getE2eChildProfile)
    .filter((profile): profile is NonNullable<ReturnType<typeof getE2eChildProfile>> =>
      Boolean(profile)
    );
}

export function resetE2eStore() {
  globalThis.__wonderwordE2eStore = {
    sessions: initialSessions.map((session) => ({ ...session })),
    createdSessionCount: 0
  };
}

export function getE2eStore() {
  if (!globalThis.__wonderwordE2eStore) {
    resetE2eStore();
  }

  return globalThis.__wonderwordE2eStore as E2eStore;
}

export function toE2eReadingSession(row: ReadingSessionRow): ReadingSession {
  return {
    id: row.id,
    childId: row.child_id,
    startTime: row.start_time,
    endTime: row.end_time,
    status: row.end_time ? "closed" : "open",
    totalWords: row.total_words,
    correctWords: row.correct_words,
    createdAt: row.created_at
  };
}

export function listE2eSessionsForUser(appUser: E2eAppUser) {
  const visibleChildIds =
    appUser.role === "CHILD" ? [appUser.id] : getE2eLinkedChildIds(appUser.id);

  return getE2eStore()
    .sessions.filter((session) => visibleChildIds.includes(session.child_id))
    .sort((a, b) => b.start_time.localeCompare(a.start_time));
}

export function findE2eSessionForChild(sessionId: string, childId: string) {
  const session = getE2eStore().sessions.find((candidate) => candidate.id === sessionId);
  return session && session.child_id === childId ? session : null;
}

export function createE2eSession(childId: string) {
  const store = getE2eStore();
  store.createdSessionCount += 1;
  const suffix = String(store.createdSessionCount).padStart(12, "0");
  const now = `2026-08-08T12:${String(store.createdSessionCount).padStart(2, "0")}:00.000Z`;
  const session: ReadingSessionRow = {
    id: `50000000-0000-4000-8000-${suffix}`,
    child_id: childId,
    start_time: now,
    end_time: null,
    total_words: 0,
    correct_words: 0,
    created_at: now
  };

  store.sessions.unshift(session);
  return session;
}

export function closeE2eSession(sessionId: string, childId: string) {
  const session = findE2eSessionForChild(sessionId, childId);
  if (!session) {
    return null;
  }

  if (!session.end_time) {
    session.end_time = "2026-08-08T12:30:00.000Z";
  }

  return session;
}

export const e2eWorksheetText =
  "The moon glows over the quiet lake. Sam reads every bright word aloud.";

export const e2eImageKeywords = ["moon", "lake", "reading"];
