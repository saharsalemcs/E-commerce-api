import { ROLES } from "../../common/constants/roles.js";
import { generateToken } from "../../common/utils/generateToken.js";
import { hashPassword } from "../../common/utils/password.js";
import { User } from "../users/user.model.js";

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
