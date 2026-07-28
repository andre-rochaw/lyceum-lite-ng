/** Contrato de erro da API Spring (`ExceptionHandling` + `ApiError`). */
export interface ApiError {
  timestamp?: string;
  status?: number;
  message: string;
}

export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    typeof (value as ApiError).message === 'string' &&
    (value as ApiError).message.trim().length > 0
  );
}

/** Extrai apenas a mensagem exibível no toast. */
export function extractApiErrorMessage(errorBody: unknown): string | null {
  if (isApiError(errorBody)) {
    return errorBody.message.trim();
  }

  if (typeof errorBody === 'string' && errorBody.trim()) {
    const trimmed = errorBody.trim();
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (isApiError(parsed)) {
        return parsed.message.trim();
      }
    } catch {
      return trimmed;
    }
    return trimmed;
  }

  if (Array.isArray(errorBody) && errorBody.length > 0) {
    const first = errorBody[0];
    if (typeof first === 'string' && first.trim()) {
      return first.trim();
    }
  }

  return null;
}
