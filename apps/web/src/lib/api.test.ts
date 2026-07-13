import { describe, it, expect } from 'vitest';
import { ErrorCodes, TableFlowError } from '@tableflow/types';

describe('TableFlowError', () => {
  it('creates error with code and status', () => {
    const err = new TableFlowError('NOT_FOUND', 'Missing', 404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.status).toBe(404);
  });

  it('has standard error codes', () => {
    expect(ErrorCodes.SESSION_EXPIRED.status).toBe(401);
    expect(ErrorCodes.VALIDATION_ERROR.status).toBe(422);
  });
});
