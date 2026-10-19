export interface FieldError {
  field: string;
  message: string;
}

interface ValidationIssue {
  path: readonly PropertyKey[];
  meessage: string;
  errors?: readonly (readonly ValidationIssue[])[];
  issues?: readonly ValidationIssue[];
}

const collectFieldErrors = () => {};

export const toFieldErrors = (
  issues: readonly ValidationIssue[],
): FieldError[] => {
  collectFieldErrors();
};



