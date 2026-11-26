import { formatIssues } from "../validators/formatIssues";
import AppError from "../errors/AppError";

const SOURCES = ["body", "params", "query"];

export const validate =
  (schemas = {}) =>
  (req, res, next) => {
    const validated = {};
    const details = [];

    for (const source of SOURCES) {
      const schema = schemas[source];
      if (!schema) continue;

      const input = source === "body" ? (req.body ?? {}) : req[source];

      const result = schema.safeParse(input);
      if (result.success) {
        validated[source] = result.data;
      } else {
        details.push(...formatIssues(result.error.issues, source));
      }
    }

    if (details.length > 0) {
      return next(new AppError("Validation failed", 400, details));
    }

    req.validated = validated;
    next();
  };
