import { ROLES } from "../../common/constants/roles.js";
import { generateToken } from "../../common/utils/token.js";
import { comparePassword, hashPassword } from "../../common/utils/password.js";
import { User } from "../users/user.model.js";
import AppError from "../../common/errors/AppError.js";

// Compared against when the email is unknown, so both failures cost one bcrypt
// compare and response time does not reveal which emails are registered.
// Built with hashPassword so it always uses the configured cost factor.
const DUMMY_PASSWORD_HASH = await hashPassword("dummy-password-for-timing");

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
  const isMatch = await comparePassword(
    password,
    user?.passwordHash ?? DUMMY_PASSWORD_HASH,
  );

  if (!user || !isMatch) {
    throw new AppError("Invalid credentials.", 401);
  }

  if (!user.isActive) {
    throw new AppError("This account is deactivated.", 401);
  }

  const token = generateToken(user.id);

  return { user, token };
};
