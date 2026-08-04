"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

export type ChildProfile = {
  nickname: string;
  age: string;
  readingLevel: string;
  interests: string[];
};

export type OnboardingData = {
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  password: string;
  childCount: string;
  children: ChildProfile[];
};

const EMPTY_CHILD: ChildProfile = {
  nickname: "",
  age: "",
  readingLevel: "starting",
  interests: [],
};

const INITIAL_DATA: OnboardingData = {
  parentName: "",
  parentPhone: "",
  parentEmail: "",
  password: "",
  childCount: "1",
  children: [{ ...EMPTY_CHILD }],
};

type OnboardingContextValue = {
  data: OnboardingData;
  updateParentInfo: (fields: Partial<Omit<OnboardingData, "children">>) => void;
  setChildCount: (count: string) => void;
  updateChild: (index: number, fields: Partial<ChildProfile>) => void;
  toggleChildInterest: (index: number, interest: string) => void;
  addChild: () => void;
  removeChild: (index: number) => void;
  reset: () => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

/**
 * Wrap the onboarding route group with this provider (see app/onboarding/layout.tsx)
 * so state survives navigation between step-1 → step-4.
 * In-memory only — a refresh clears it. Swap the state source for
 * sessionStorage or a real API call once the flow is wired up for real.
 */
export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<OnboardingData>(INITIAL_DATA);

  const updateParentInfo: OnboardingContextValue["updateParentInfo"] = (
    fields
  ) => {
    setData((prev) => ({ ...prev, ...fields }));
  };

  const setChildCount = (count: string) => {
    setData((prev) => ({ ...prev, childCount: count }));
  };

  const updateChild: OnboardingContextValue["updateChild"] = (
    index,
    fields
  ) => {
    setData((prev) => {
      const next = [...prev.children];
      next[index] = { ...next[index], ...fields };
      return { ...prev, children: next };
    });
  };

  const toggleChildInterest = (index: number, interest: string) => {
    setData((prev) => {
      const next = [...prev.children];
      const current = next[index].interests;
      next[index] = {
        ...next[index],
        interests: current.includes(interest)
          ? current.filter((i) => i !== interest)
          : [...current, interest],
      };
      return { ...prev, children: next };
    });
  };

  const addChild = () => {
    setData((prev) => ({
      ...prev,
      children: [...prev.children, { ...EMPTY_CHILD }],
    }));
  };

  const removeChild = (index: number) => {
    setData((prev) => ({
      ...prev,
      children: prev.children.filter((_, i) => i !== index),
    }));
  };

  const reset = () => setData(INITIAL_DATA);

  return (
    <OnboardingContext.Provider
      value={{
        data,
        updateParentInfo,
        setChildCount,
        updateChild,
        toggleChildInterest,
        addChild,
        removeChild,
        reset,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return ctx;
}