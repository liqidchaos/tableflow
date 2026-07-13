export class TableFlowError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number
  ) {
    super(message);
    this.name = 'TableFlowError';
  }
}

export function errorResponse(error: TableFlowError): Response {
  return Response.json(
    { error: { code: error.code, message: error.message, status: error.status } },
    { status: error.status }
  );
}

export const ErrorCodes = {
  UNAUTHORIZED: { code: 'UNAUTHORIZED', status: 401 },
  SESSION_EXPIRED: { code: 'SESSION_EXPIRED', status: 401 },
  FORBIDDEN: { code: 'FORBIDDEN', status: 403 },
  NOT_FOUND: { code: 'NOT_FOUND', status: 404 },
  ITEM_UNAVAILABLE: { code: 'ITEM_UNAVAILABLE', status: 409 },
  PAYMENT_FAILED: { code: 'PAYMENT_FAILED', status: 402 },
  VENUE_NOT_ONBOARDED: { code: 'VENUE_NOT_ONBOARDED', status: 403 },
  VALIDATION_ERROR: { code: 'VALIDATION_ERROR', status: 422 },
  RATE_LIMITED: { code: 'RATE_LIMITED', status: 429 },
  INTERNAL_ERROR: { code: 'INTERNAL_ERROR', status: 500 },
} as const;

export function throwError(
  key: keyof typeof ErrorCodes,
  message: string
): never {
  const { code, status } = ErrorCodes[key];
  throw new TableFlowError(code, message, status);
}
