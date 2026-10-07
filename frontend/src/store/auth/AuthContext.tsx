import { authReducer, AuthState } from '@/store/auth/AuthReducer';
import { ReactNode, useReducer } from 'react';

const initial_state: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null
}

export const AuthProvider = ({children}: {children:ReactNode})=>{
  const [state, dispatch] = useReducer(authReducer, initial_state)
}