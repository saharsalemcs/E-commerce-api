const AppError = require("../errors/AppError");

// Runs only when no route matched. Forwards a 404 to the error middleware.
const notFound = (req, _res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};

module.exports = notFound;
