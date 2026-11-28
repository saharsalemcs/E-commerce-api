import config from "../../config/index.js";
import AppError from "../errors/AppError.js";
import { sendError } from "../utils/response.js";

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

  // jsonwebtoken: expired token. The client should log in again.
  if (err.name === "TokenExpiredError") {
    return new AppError("Your session has expired. Please log in again.", 401);
  }

  // jsonwebtoken: bad signature, malformed token, or not active yet.
  if (err.name === "JsonWebTokenError" || err.name === "NotBeforeError") {
    return new AppError("Invalid token. Please log in again.", 401);
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
    return sendError(res, {
      statusCode: appError.statusCode,
      message: appError.message,
      details: appError.details,
    });
  }

  // Unknown error: log it on the server, send a generic message to the client.
  console.error(err);
  return sendError(res, {
    statusCode: 500,
    message: "Internal server error",
    stack: config.env === "development" ? err.stack : undefined,
  });
};

export default errorHandler;
