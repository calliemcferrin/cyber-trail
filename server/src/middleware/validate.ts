/**
 * Validation middleware. Every route body/param is parsed through a Zod schema
 * before the handler runs. Unknown keys are stripped, wrong types rejected —
 * "reject by default". On failure we return a generic 400 with no internals.
 */
import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';

export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: 'Invalid request.', code: 'validation' });
      return;
    }
    // Replace body with the parsed (and stripped) value.
    req.body = result.data;
    next();
  };
}

/** Validate a single path param against a schema. */
export function validateParam<T>(name: string, schema: ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params[name]);
    if (!result.success) {
      res.status(400).json({ error: 'Invalid request.', code: 'validation' });
      return;
    }
    next();
  };
}
