import jwt from "jsonwebtoken";
import config from "../../config/index.js";

export function generateToken(userId) {
  const token = jwt.sign({ sub: userId.toString() }, config.jwt.jwtSecret, {
    algorithm: "HS256",
    expiresIn: config.jwt.expiresIn,
  });

  return token;
}
