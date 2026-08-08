"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import type { ChildCreationResult } from "@/app/onboarding/actions";

export type ChildProfile = {
  nickname: string;
  age: string;
  readingLevel: string;
};

export type OnboardingData = {
  parentName: string;
  parentEmail: string;
  password: string;
  childCount: string;
  children: ChildProfile[];
};

const EMPTY_CHILD: ChildProfile = {
  nickname: "",
  age: "",
  readingLevel: "starting",
};

const INITIAL_DATA: OnboardingData = {
  parentName: "",
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
  addChild: () => void;
  removeChild: (index: number) => void;
  submissionResult: ChildCreationResult[] | null;
  setSubmissionResult: (result: ChildCreationResult[] | null) => void;
  reset: () => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<OnboardingData>(INITIAL_DATA);
  const [submissionResult, setSubmissionResult] = useState<ChildCreationResult[] | null>(null);

  const updateParentInfo: OnboardingContextValue["updateParentInfo"] = (fields) => {
    setData((prev) => ({ ...prev, ...fields }));
  };

  const setChildCount = (count: string) => {
    setData((prev) => ({ ...prev, childCount: count }));
  };

  const updateChild: OnboardingContextValue["updateChild"] = (index, fields) => {
    setData((prev) => {
      const next = [...prev.children];
      next[index] = { ...next[index], ...fields };
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

  const reset = () => {
    setData(INITIAL_DATA);
    setSubmissionResult(null);
  };

  return (
    <OnboardingContext.Provider
      value={{
        data,
        updateParentInfo,
        setChildCount,
        updateChild,
        addChild,
        removeChild,
        submissionResult,
        setSubmissionResult,
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