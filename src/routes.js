import express from "express";
import authRouter from "./modules/auth/auth.route.js";

const router = express.Router();

router.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "Service is up" });
});

// One line per module router.
router.use("/auth", authRouter);

export default router;
