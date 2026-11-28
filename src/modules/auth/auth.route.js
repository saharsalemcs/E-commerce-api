import express from "express";
import { validate } from "../../common/middlewares/validate.js";
import { loginBodySchema, registerBodySchema } from "./auth.validation.js";
import * as authController from "./auth.controller.js";

const router = express.Router();

router.post(
  "/register",
  validate({ body: registerBodySchema }),
  authController.registerController,
);

router.post(
  "/login",
  validate({ body: loginBodySchema }),
  authController.loginController,
);

export default router;
