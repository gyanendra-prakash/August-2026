export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

// Express 4 async handler wrapper: rejected promises -> error middleware
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function errorMiddleware(err, req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err?.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }
  console.error('Unexpected error:', err);
  return res.status(500).json({ error: 'Internal server error' });
}
