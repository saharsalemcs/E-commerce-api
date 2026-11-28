import { sendSuccess } from "../../common/utils/response.js";
import * as authService from "./auth.service.js";

export const registerController = async (req, res) => {
  const { user } = await authService.register(req.validated.body);

  sendSuccess(res, { statusCode: 201, data: { user } });
};
