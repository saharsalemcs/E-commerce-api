import AppError from "../../common/errors/AppError.js";
import { verifyToken } from "../../common/utils/token.js";
import { User } from "../users/user.model.js";

export const authenticate = async (req, _res, next) => {
  // 1) Get Header
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer "))
    throw new AppError(
      "You are not logged in. Please log in to get access!",
      401,
    );

  const token = header.split(" ")[1];

  // 2) verify (expired vs invalid)
  const payload = verifyToken(token);

  // 3) Check if user still exists  even the token still available
  const currentUser = await User.findById(payload.sub);
  if (!currentUser || !currentUser.isActive) {
    throw new AppError("This account no longer available!", 401);
  }

  // 4) password changed after token was issued
  if (currentUser.passwordChangedAt) {
    const changedAtSec = Math.floor(
      currentUser.passwordChangedAt.getTime() / 1000,
    );

    if (payload.iat < changedAtSec) {
      throw new AppError("Password was changed. Please log in again!", 401);
    }
  }

  // 5) attach the user to request => Grant access to protected route
  req.user = currentUser;
  next();
};
