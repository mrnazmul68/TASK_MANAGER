interface ApiErrorShape {
  response?: {
    status?: number;
    data?: {
      message?: string;
    };
  };
  message?: string;
}

const isApiError = (error: unknown): error is ApiErrorShape =>
  error !== null && typeof error === "object" && "message" in error;

export const getErrorMessage = (error: unknown): string =>
  isApiError(error)
    ? error?.response?.data?.message || error?.message || "Something went wrong"
    : "Something went wrong";
