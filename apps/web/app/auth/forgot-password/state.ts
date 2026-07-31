export type ForgotPasswordActionState = {
  message: string | null;
  success: boolean;
  email: string;
};

export const initialForgotPasswordState: ForgotPasswordActionState = {
  message: null,
  success: false,
  email: "",
};