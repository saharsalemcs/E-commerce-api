import bcrypt from "bcryptjs";
import config from "../../config/index.js";

export const hashPassword = async (plain) =>
  bcrypt.hash(plain, config.bcryptRounds);

export const comparePassword = async (plain, hash) =>
  bcrypt.compare(plain, hash);
