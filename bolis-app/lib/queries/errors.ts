export class QueryError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'QueryError';
  }
}

export function assertNoError(
  error: { message: string } | null,
  context: string,
): void {
  if (error) {
    throw new QueryError(`${context}: ${error.message}`, error);
  }
}
