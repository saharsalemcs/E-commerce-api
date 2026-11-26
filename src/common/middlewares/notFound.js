import AppError from "../errors/AppError.js";

// Runs only when no route matched. Forwards a 404 to the error middleware.
const notFound = (req, _res, next) => {
  next(
    new AppError(`This Route not found: ${req.method} ${req.originalUrl}`, 404),
  );
};

export default notFound;
