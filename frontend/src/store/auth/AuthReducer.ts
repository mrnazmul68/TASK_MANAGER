import { User } from "@/types";
import { AUTH_ACTIONS } from "./AuthActions";

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

type AuthAction =
  | {
      type: typeof AUTH_ACTIONS.SET_LOADING;
      payload: boolean;
    }
  | { type: typeof AUTH_ACTIONS.LOGIN_SUCCESS; payload: { user: User } }
  | { type: typeof AUTH_ACTIONS.SET_ERROR; payload: string | null };

export const authReducer = (state: AuthState, action: AuthAction) => {
  switch (action.type) {
    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
      };

    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case AUTH_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };
    default:
      return state;
  }
};
