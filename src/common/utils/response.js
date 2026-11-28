// The only place that knows the response shape (decision P1-T05).
// Keys with an undefined value are left out of the JSON automatically.

export const sendSuccess = (res, { statusCode = 200, data, meta }) =>
  res.status(statusCode).json({ success: true, data, meta });

// Used by the error middleware only. Everywhere else, throw an AppError.
export const sendError = (res, { statusCode, message, details, stack }) =>
  res.status(statusCode).json({ success: false, message, details, stack });
