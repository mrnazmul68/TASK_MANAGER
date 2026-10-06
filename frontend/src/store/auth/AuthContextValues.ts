import { createContext } from "react";

export interface AuthActionsValue {
  register: (data: {
    name: string;
    email: string;
    password: string;
  }) => Promise<boolean>;
}

export const AuthActionsContext = createContext<AuthActionsValue | null>(null);
