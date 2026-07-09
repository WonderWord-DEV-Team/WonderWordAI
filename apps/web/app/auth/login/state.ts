export type LoginActionState = {
  message: string | null;
  email: string;
};

export const initialLoginState: LoginActionState = {
  message: null,
  email: ""
};
