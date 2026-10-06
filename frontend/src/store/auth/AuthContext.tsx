import { AuthState } from '@/store/auth/AuthReducer';
const initial_state: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null
}