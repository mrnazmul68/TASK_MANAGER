import { authReducer, AuthState } from "@/store/auth/AuthReducer";
import { ReactNode, useCallback, useMemo, useReducer } from "react";
import { AUTH_ACTIONS } from "./AuthActions";
import { AuthActionsContext, AuthActionsValue, AuthStateContext } from "@/store/auth/AuthContextValues";
import { authService } from "@/services/authService";
import { setUser } from "@/lib/storage";

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
        payload: true,
      });
      try {
        const { user } = await authService.register(data);
        setUser(user);
        dispatch({
          type:AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: {user}
        })
        return true
      } catch (error) {
        console.log(error);
      }
    },

    [],
  );

  const actionsValue = useMemo<AuthActionsValue>(()=>({register}), [register])

  return (
    <AuthStateContext value={state}>
      <AuthActionsContext.Provider value={actionsValue}>
        {children}
      </AuthActionsContext.Provider>
    </AuthStateContext>
  );
};
