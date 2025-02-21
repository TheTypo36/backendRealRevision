import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { upload } from "../middlewares/multer.middleware.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const options = {
  httpOnly: true,
  secure: true,
};
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateAccessToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(401, error);
  }
};

const registerUser = asyncHandler(async (req, res) => {
  //get the user details from frontend( via postman)
  //validate if the details are correct or not
  // check if user already exist: username, email;
  // check for images and for avatar( check for files)
  //upload them to cloudinary and check for avatar them
  //create user object - create entry in DB
  //remove password and refresh token field from response
  //check for user creation
  //return response or return error
  console.log("in controller");
  const { fullName, email, username, password } = req.body;
  console.log("email: ", email);
  console.log("fullName: ", fullName);
  console.log("username: ", username);
  console.log("password: ", password);

  // if (fullName === "") {
  //   throw new ApiError(400, "fullname is required");
  // } -> this method is good but below is advance method
  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(409, "All field are required");
  }
  const existingUser = await User.findOne({
    $or: [{ email }, { username }],
  });
  if (existingUser) {
    throw new ApiError(500, "user existed!!");
  }

  console.log("req.file", req.files.avatar[0].path);
  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  console.log("avater is here", avatar);
  if (!avatar) {
    throw new ApiError(400, "Avatar is required");
  }
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    username: username.toLowerCase(),
    email,
    password,
  });

  //checking if user is created in Db by find it in Db
  const createdUser = await User.findById(user?._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "something went wrong while registering the user");
  }

  //sending response

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "user registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  //take email and password from req.body
  // find out user exist
  //check if the password is correct
  //generate the access token and refresh token and send them to user
  // send access token and refresh token in cookie;
  console.log(req.body);
  const { email, password } = req.body;
  if (!email || !password) {
    throw new ApiError(400, "email and password is required");
  }

  const existingUser = await User.findOne({ email });
  if (!existingUser) {
    throw new ApiError(404, "user doesn't exists, register the user");
  }
  let accessToken;
  let refreshToken;
  if (await existingUser.isPasswordCorrect(password)) {
    accessToken = await existingUser.generateAccessToken();
    refreshToken = await existingUser.generateRefreshToken();
  } else {
    throw new ApiError(404, "password is wrong");
  }
  if (!accessToken || !refreshToken) {
    throw new ApiError(501, "could generate access or refresh token");
  }
  existingUser.refreshToken = refreshToken;
  await existingUser.save({ validateBeforeSave: false });
  console.log("final user", existingUser);

  const loggedInUser = await User.findById(existingUser._id).select(
    "-password -refreshToken"
  );

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User loggedIn successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  // console.log("user", req.user);
  console.log("cookie", req.cookies);
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(201, {}, "user is loggedOut"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  try {
    const incomingRefreshToken =
      req.cookie.refreshToken || req.body.refreshToken;
    if (!incomingRefreshToken) {
      throw new ApiError(404, "incomingRefreshToken not find");
    }

    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFERESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "invalid refreshToken");
    }
    if (user?.refreshToken !== incomingRefreshToken) {
      throw new ApiError(401, "refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };
    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            refreshToken: newRefreshToken,
          },
          "user loggedIn again"
        )
      );
  } catch (error) {
    throw new ApiError(
      401,
      error?.message || "refreshAccess can be generated for some reason"
    );
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  try {
    const { currPassword, newPassword } = req.body;

    const user = await User.findById(req.user?._id);

    if (!user) {
      throw new ApiError(404, "user with this email doesn't exists");
    }

    if (!(await user.isPasswordCorrect(currPassword))) {
      throw new ApiError(401, "password doesn't match with curr password");
    }

    user.password = newPassword;

    await user.save({ validateBeforeSave: false });

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "password changed successfully"));
  } catch (error) {
    throw new ApiError(
      501,
      error.message || "something went wrong in changing the password"
    );
  }
});

const getCurrUser = asyncHandler(async (req, res) => {
  const user = req.User;

  return res
    .status(200)
    .json(new ApiResponse(200, user, "this is current user"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;
  if (!fullName || !email) {
    throw new ApiError(400, "fullName and email are required");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName: fullName,
        email: email,
      },
    },
    { new: true }
  ).select("-password");

  if (!user) {
    throw new ApiError(404, "user not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "update info successfully"));
});

const updateAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "avatarLocalPath not present");
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading on cloudinary");
  }
  const user = await findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    {
      new: true,
    }
  ).select("-password");
  return res
    .status(200)
    .json(new ApiResponse(200, user, "avatar updated successfully"));
});
const updateCoverImage = asyncHandler(async (req, res) => {
  const coverLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "coverLocalPath not present");
  }
  const coverImage = await uploadOnCloudinary(coverLocalPath);

  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading on cloudinary");
  }
  const user = await findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    {
      new: true,
    }
  ).select("-password");
  return res
    .status(200)
    .json(new ApiResponse(200, user, "coverImage updated successfully"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  //so you get to this page by url/username so we will get
  //data by params

  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "username is missing");
  }
  //this is also a good way to got it but we will use aggregate method just to say
  //time and effort
  // const user = await User.findOne({ username });

  //pipelines
  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribe: {
          $cond: {
            if: { $in: [req.user?.id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribe: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);
  if (!channel?.length) {
    throw new ApiError(404, "channel does not exists");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0]),
      " user channel fetched successfullly"
    );
});
export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrUser,
  updateAccountDetails,
  updateAvatar,
  updateCoverImage,
  getUserChannelProfile,
};
