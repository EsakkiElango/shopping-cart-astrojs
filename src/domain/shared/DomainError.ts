export type DomainErrorCode = 'VALIDATION' | 'NOT_FOUND' | 'CONFLICT' | 'BUSINESS_RULE';

export class DomainError {
  private constructor(
    public readonly code: DomainErrorCode,
    public readonly message: string,
    public readonly details?: Record<string, string>,
  ) {}

  static validation(message: string, details?: Record<string, string>): DomainError {
    return new DomainError('VALIDATION', message, details);
  }

  static notFound(message: string): DomainError {
    return new DomainError('NOT_FOUND', message);
  }

  static conflict(message: string): DomainError {
    return new DomainError('CONFLICT', message);
  }

  static businessRule(message: string): DomainError {
    return new DomainError('BUSINESS_RULE', message);
  }
}
