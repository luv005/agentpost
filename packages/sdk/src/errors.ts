export class AgentSendError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AgentSendError";
  }
}

export class AuthenticationError extends AgentSendError {
  constructor(message = "Invalid API key") {
    super(401, "UNAUTHORIZED", message);
    this.name = "AuthenticationError";
  }
}

export class NotFoundError extends AgentSendError {
  constructor(message = "Resource not found") {
    super(404, "NOT_FOUND", message);
    this.name = "NotFoundError";
  }
}

export class RateLimitError extends AgentSendError {
  constructor(
    message = "Rate limit exceeded",
    public readonly retryAfter?: number,
  ) {
    super(429, "RATE_LIMIT_EXCEEDED", message);
    this.name = "RateLimitError";
  }
}

export class ValidationError extends AgentSendError {
  constructor(message = "Validation error") {
    super(400, "VALIDATION_ERROR", message);
    this.name = "ValidationError";
  }
}
