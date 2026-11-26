import config from "../../config/index.js";
import AppError from "../errors/AppError.js";

// Turn known library errors into AppError so there is one path to the client.
const normalizeError = (err) => {
  if (err instanceof AppError) return err;

  // Malformed JSON body (thrown by express.json / body-parser).
  if (err.type === "entity.parse.failed") {
    return new AppError("Malformed JSON in request body", 400);
  }

  // Other client errors from body-parser (for example payload too large).
  if (err.expose === true && err.statusCode >= 400 && err.statusCode < 500) {
    return new AppError(err.message, err.statusCode);
  }

  // Mongoose: invalid ObjectId or wrong type for a field.
  if (err.name === "CastError") {
    return new AppError(`Invalid value for field: ${err.path}`, 400);
  }

  // Mongoose: schema validation failed.
  if (err.name === "ValidationError" && err.errors) {
    const details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return new AppError("Validation failed", 400, details);
  }

  // MongoDB: duplicate key on a unique index.
  if (err.code === 11000) {
    const fields = Object.keys(err.keyValue || {});
    const label = fields.length ? fields.join(", ") : "unique field";
    return new AppError(`Duplicate value for: ${label}`, 409);
  }

  return null;
};

const errorHandler = (err, req, res, _next) => {
  if (res.headersSent) {
    return _next(err);
  }

  const appError = normalizeError(err);

  if (appError) {
    const body = { success: false, message: appError.message };
    if (appError.details) body.details = appError.details;
    return res.status(appError.statusCode).json(body);
  }

  // Unknown error: log it on the server, send a generic message to the client.
  console.error(err);
  const body = { success: false, message: "Internal server error" };
  if (config.env === "development") {
    body.stack = err.stack;
  }
  return res.status(500).json(body);
};

export default errorHandler;
