import { authReducer, AuthState } from "@/store/auth/AuthReducer";
import { ReactNode, useCallback, useReducer } from "react";
import { AUTH_ACTIONS } from "./AuthActions";
import { AuthActionsContext } from "./AuthContextValues";
import { authService } from "@/services/authService";

const initial_state: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(authReducer, initial_state);

  const register = useCallback(
    async (data: { name: string; email: string; password: string }) => {
      dispatch({
        type: AUTH_ACTIONS.SET_LOADING,
        payload: false,
      });
      try {
        const { user } = await authService.register(data);
      } catch (error) {
        console.log(error);
      }
    },

    [],
  );

  const actionValue = { register };

  return (
    <AuthActionsContext.Provider value={actionsValue}>
      {children}
    </AuthActionsContext.Provider>
  );
};
