export type ResetPasswordActionState = {
  message: string | null;
  success: boolean;
};

export const initialResetPasswordState: ResetPasswordActionState = {
  message: null,
  success: false,
};