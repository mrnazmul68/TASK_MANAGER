import { AuthActionsContext } from "@/store/auth/AuthContextValues";
import { useContext } from "react";

export const useAuthActions = () => {
  const actions = useContext(AuthActionsContext);
  if (!actions) {
    throw new Error("useAuthActions must be used within an AuthProvider");
  }

  return actions;
};
