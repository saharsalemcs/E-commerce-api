import express from "express";
import { sendSuccess } from "./common/utils/response.js";
import authRouter from "./modules/auth/auth.route.js";
import userRouter from "./modules/users/user.route.js";

const router = express.Router();

router.get("/health", (req, res) => {
  sendSuccess(res, { data: { message: "Service is up" } });
});

// One line per module router.
router.use("/auth", authRouter);
router.use("/users", userRouter);

export default router;
