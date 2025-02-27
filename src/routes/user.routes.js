import { Router } from "express";
import {
  changeCurrentPassword,
  getCurrUser,
  getUserChannelProfile,
  getWatchHistory,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  updateAccountDetails,
  updateAvatar,
  updateCoverImage,
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
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").post(verifyJwt, changeCurrentPassword);
router.route("/curr-user").get(verifyJwt, getCurrUser);
//dont' use post, user patch because post update all the details whereas patch
// only update what you have changed
router.route("/update-account").patch(verifyJwt, updateAccountDetails);

router.route("/avatar").patch(verifyJwt, upload.single("avatar"), updateAvatar);
router
  .route("/cover-image")
  .patch(verifyJwt, upload.single("coverImage"), updateCoverImage);

//params is diffcult  part
router.route("/c/:username").get(verifyJwt, getUserChannelProfile);
router.route("/history").get(verifyJwt, getWatchHistory);
export default router;
