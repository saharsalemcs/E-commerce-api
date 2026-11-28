import * as authService from "./auth.service.js";

export const registerController = async (req, res) => {
  const { user, token } = await authService.register(req.validated.body);

  res.status(201).json({ status: "success", data: { user }, token });
};
