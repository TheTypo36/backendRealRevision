import { Router } from "express";
import {
  loginUser,
  logoutUser,
  registerUser,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJwt } from "../middlewares/auth.middlemare.js";
const router = Router();
router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 2,
    },
  ]),
  registerUser
);

router.route("/login").post(loginUser);
//these routes are only given when user is loggedIn
router.route("/logout").post(verifyJwt, logoutUser);

router.route("/test-cookie").post((req, res) => {
  console.log(req.cookies);
  res.status(200).json({
    data: req.cookies,
  });
});
export default router;
