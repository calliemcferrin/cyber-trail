/**
 * Centralized error handling. Detailed errors are logged server-side; the client
 * only ever receives a generic message. This prevents information disclosure
 * (stack traces, internal paths, library versions) via error responses.
 */
import type { NextFunction, Request, Response } from 'express';
import { GameEngineError } from '../game/engine.js';

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ error: 'Not found.', code: 'not_found' });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  if (err instanceof GameEngineError) {
    // Expected, domain-level errors: safe to surface the code + message.
    res.status(400).json({ error: err.message, code: err.code });
    return;
  }

  // Unexpected errors: log internally, return nothing revealing.
  console.error('[error]', err);
  res.status(500).json({ error: 'Internal server error.', code: 'internal' });
}
