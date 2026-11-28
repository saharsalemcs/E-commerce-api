import express from "express";
import { validate } from "../../common/middlewares/validate.js";
import { registerBodySchema } from "./auth.validation.js";
import * as authController from "./auth.controller.js";

const router = express.Router();

router.post(
  "/register",
  validate({ body: registerBodySchema }),
  authController.registerController,
);

export default router;
