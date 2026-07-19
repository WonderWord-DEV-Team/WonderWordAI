export const childReportQueryKeys = {
  all: ["childReport"] as const,
  detail: (childId: string) => [...childReportQueryKeys.all, childId] as const
};
