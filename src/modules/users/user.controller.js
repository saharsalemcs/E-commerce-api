import { sendSuccess } from "../../common/utils/response.js";

export const getMeController = (req, res) => {
  sendSuccess(res, { data: { user: req.user } });
};
