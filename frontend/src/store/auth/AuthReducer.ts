import { User } from "@/types";
import { AUTH_ACTIONS } from "./AuthActions";

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

type AuthAction = {
  type: typeof AUTH_ACTIONS.SET_LOADING;
  payload: boolean;
};

export const authReducer = (state: AuthState, action: AuthAction) => {
  switch (action.type) {
    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
      };
    default:
      return state;
  }
};
