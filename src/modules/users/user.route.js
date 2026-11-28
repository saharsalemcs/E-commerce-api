import express from "express";
import { authenticate } from "../auth/auth.middleware.js";
import * as userController from "./user.controller.js";

const router = express.Router();

router.get("/me", authenticate, userController.getMeController);

export default router;
