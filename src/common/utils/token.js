import jwt from "jsonwebtoken";
import config from "../../config/index.js";

export function generateToken(userId) {
  const token = jwt.sign({ sub: userId.toString() }, config.jwt.jwtSecret, {
    algorithm: "HS256",
    expiresIn: config.jwt.expiresIn,
  });

  return token;
}

export function verifyToken(token) {
  return jwt.verify(token, config.jwt.jwtSecret, { algorithms: ["HS256"] });
}
