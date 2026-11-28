import { ROLES } from "../../common/constants/roles.js";
import { generateToken } from "../../common/utils/generateToken.js";
import { comparePassword, hashPassword } from "../../common/utils/password.js";
import { User } from "../users/user.model.js";
import AppError from "../../common/errors/AppError.js";

export const register = async ({ name, email, phone, password }) => {
  const passwordHash = await hashPassword(password);

  const user = await User.create({
    name,
    email,
    phone,
    passwordHash,
    role: ROLES.CUSTOMER,
  });

  const token = generateToken(user.id);

  return { user, token };
};

export const login = async ({ email, password }) => {
  const user = await User.findOne({ email }).select("+passwordHash");
  if (!user || (await comparePassword(password, user.passwordHash))) {
    return new AppError("Invalid credentials.", 401);
  }

  if (!user.isActive) {
    return new AppError("This account is deactivated.", 403);
  }

  const token = generateToken(user.id);

  return { user, token };
};
