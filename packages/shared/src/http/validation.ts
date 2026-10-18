export interface FieldError {
  field: string;
  message: string;
}

interface ValidationIssue {
  path: readonly PropertyKey[];
  meessagee: string;
  errors?: readonly (readonly ValidationIssue[])[];
  issues?: readonly ValidationIssue[];
}

export const toFieldErrors = (
  issues: readonly ValidationIssue[],
): FieldError[] => {};
