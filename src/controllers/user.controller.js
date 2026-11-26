import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access tokens!"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // 1. Get user details from frontend
  const { fullname, email, username, password } = req.body;

  // 2. Validation - check for empty fields
  if (
    [fullname, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(
      400,
      "All fields (fullName, email, username, password) are required to register!"
    );
  }

  // 3. Check if user already exists (by username or email)
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with this email or username already exists!");
  }

  // 4. Check for images (avatar is required, coverImage is optional)
  const avatarLocalPath = req.files?.avatar?.[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files?.coverImage[0]?.path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar image file is required for registration!");
  }

  // 5. Upload images to Cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar) {
    throw new ApiError(
      500,
      "Something went wrong while uploading avatar to Cloudinary!"
    );
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  // 6. Create user object in DB
  const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  // 7. Verify user creation & remove password/refreshToken from response
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(
      500,
      "Something went wrong while registering the user in the database!"
    );
  }

  // 8. Return success response
  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User registered successfully!"));
});

const loginUser = asyncHandler(async (req, res) => {
  // req body->data
  // username or email
  // find the user
  // password
  // access and refresh token
  // send cookie

  // 1. Extract credentials from the request body
  // Users can log in using either their email or username alongside their password
  const { email, username, password } = req.body;

  // 2. Validate that at least one identifier (username or email) is provided
  if (!username && !email) {
    throw new ApiError(400, "Username or email is required to log in!");
  }

  // 3. Validate that a password was sent in the request
  if (!password) {
    throw new ApiError(400, "Password is required to log in!");
  }

  // 4. Query the database to find a matching user by email OR username
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  // If no record matches, stop execution and return a 404 Not Found error
  if (!user) {
    throw new ApiError(
      404,
      "User registered with this credential does not exist!"
    );
  }

  // 5. Verify the password using the custom Mongoose instance method (bcrypt comparison)
  const isPassword = await user.isPasswordCorrect(password);

  // If the password hash doesn't match, return a 401 Unauthorized error
  if (!isPassword) {
    throw new ApiError(401, "Invalid user credentials provided!");
  }

  // 6. Generate short-lived Access Token and long-lived Refresh Token
  // Usually handled by a helper method (e.g., generateAccessAndRefreshTokens(user._id))
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  // 7. Fetch the logged-in user document again, explicitly excluding sensitive fields
  // We never want to send the hashed password or refresh token inside the JSON body
  const loggedInUser = await User.findOne(user._id).select(
    "-password -refreshToken"
  );

  // 8. Configure cookie security options
  const options = {
    httpOnly: true,
    secure: true,
  };

  // 9. Send the final response:
  // - Attach both tokens as secure HTTP-only cookies
  // - Return a standardized 200 OK JSON payload containing user details and tokens
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
        "User logged In successfully!"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  // 1. Clear the refreshToken from the database
  // We use req.user._id because the user must first pass through the verifyJWT middleware,
  // which securely populates req.user from the incoming access token.
  await User.findByIdAndUpdate(
    req.user._id,
    {
      // $set: {
      //   refreshToken: null,
      // },
      // $unset operator removes the refreshToken field entirely from the user document
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );

  // 2. Define clear cookie options
  // These options (especially path and domain) should ideally match
  // the options used when the cookies were originally set during login.
  const options = {
    httpOnly: true,
    secure: true,
  };

  // 3. Clear the cookies from the client's browser and send success response
  // res.clearCookie() instructs the browser to delete the cookie keys
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully!"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  // 1. Extract the incoming refresh token
  // Web browsers send it automatically via cookies; mobile/API clients may send it in req.body
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  // 2. Reject the request immediately if no refresh token was provided
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request: Refresh token is missing!");
  }

  try {
    // 3. Cryptographically verify the incoming refresh token using the secret key
    // If the token is expired or tampered with, jwt.verify() throws an error caught below
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    // 4. Look up the user associated with the decoded token's payload (_id)
    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(
        401,
        "Invalid refresh token: Associated user not found!"
      );
    }

    // 5. Security Check (Token Reuse / Rotation Detection):
    // Compare the incoming token with the active refreshToken stored in the database.
    // If they don't match, the token was either invalidated on logout or already rotated.
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(
        401,
        "Refresh token is expired or has already been used!"
      );
    }

    // 6. Generate a brand-new pair of Access and Refresh tokens
    // Rotating the refresh token ensures each refresh token is single-use
    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    // 7. Configure strict cookie security options
    // httpOnly: prevents client-side JS from reading the cookie (XSS protection)
    // secure: ensures cookies are transmitted strictly over HTTPS
    const options = {
      httpOnly: true,
      secure: true,
    };

    // 8. Set the updated HTTP-only cookies and return the new tokens in the JSON payload
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access Token refreshed!"
        )
      );
  } catch (error) {
    // 9. Catch JWT verification errors (e.g., TokenExpiredError, JsonWebTokenError)
    // or re-throw any ApiError created inside the try block
    throw new ApiError(
      401,
      error?.message || "Invalid or expired refresh token! Please log in again."
    );
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  // 1. Extract old and new passwords from the request body
  const { oldPassword, newPassword } = req.body;

  // 2. Validate that both fields are provided and not empty/whitespace
  if (
    !oldPassword ||
    !newPassword ||
    oldPassword.trim() === "" ||
    newPassword.trim() === ""
  ) {
    throw new ApiError(
      400,
      "Both old password and new password are required fields!"
    );
  }

  // 3. Fetch the authenticated user from the database
  const user = await User.findById(req.user?._id);

  if (!user) {
    throw new ApiError(404, "User not found! Please log in again.");
  }

  // 4. Verify that the provided old password matches the stored hash
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(
      401,
      "Old password is incorrect! Please verify your current password."
    );
  }

  // 5. Update the user's password field
  // Setting user.password = newPassword will trigger your pre-save hook to hash it automatically with bcrypt
  user.password = newPassword;

  // Save the updated user document (validateBeforeSave: false ensures schema validation rules skip)
  await user.save({ validateBeforeSave: false });

  // 6. Return a successful response confirming the password change
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "current user fetched successfully!"));
});

const updateAccountsDetails = asyncHandler(async (req, res) => {
  // 1. Extract updated fields from request body
  const { fullname, email } = req.body;

  // 2. Validate that required fields are not empty/missing
  if (!fullname || !email || fullname.trim() === "" || email.trim() === "") {
    throw new ApiError(400, "Both full name and email are required fields!");
  }

  // 3. Find user by ID (from verifyJWT middleware) and update the fields atomically
  // { new: true } returns the updated document; .select() excludes sensitive data
  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullname,
        email,
      },
    },
    { new: true }
  ).select("-password");

  if (!updatedUser) {
    throw new ApiError(404, "User not found! Please log in again.");
  }

  // 4. Return success response with updated user details
  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedUser, "Account details updated successfully!")
    );
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  // 1. Get the local file path of the uploaded avatar from Multer
  const avatarLocalPath = req.file?.path;

  // 2. Validate that a file was actually provided in the request
  if (!avatarLocalPath) {
    throw new ApiError(
      400,
      "Avatar image file is missing from the upload request!"
    );
  }

  // 3. Upload the new avatar image to Cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(
      400,
      "Something went wrong while uploading the new avatar to Cloudinary!"
    );
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    {
      new: true,
    }
  ).select("-password");

  if (!updatedUser) {
    throw new ApiError(404, "User not found! Please log in again.");
  }

  // 4. Return success response
  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedUser, "Avatar image updated successfully!")
    );
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  // 1. Get the local file path of the uploaded cover image from Multer
  const coverImageLocalPath = req.file?.path;

  // 2. Validate that a file was provided
  if (!coverImageLocalPath) {
    throw new ApiError(
      400,
      "Cover image file is missing from the upload request!"
    );
  }

  // 3. Upload the new cover image to Cloudinary
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url) {
    throw new ApiError(
      500,
      "Something went wrong while uploading the new cover image to Cloudinary!"
    );
  }

  // 4. Update user's coverImage field in the database
  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    {
      new: true,
    }
  ).select("-password");

  // 5. Return success response
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedUser,
        "User cover image updated successfully!"
      )
    );
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username) {
    throw new ApiError(400, "username is missing");
  }

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
        subscribersCount: { $size: "$subscribers" },
        channelsSubscribedToCount: { $size: "$subscribedTo" },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullname: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        avatar: 1,
        coverImage: 1,
        isSubscribed: 1,
        email: 1,
      },
    },
  ]);

  if (!channel.length) {
    throw new ApiError(404, "Channel not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "Channel profile fetched successfully!")
    );
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullname: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0]?.watchHistory,
        "Watch history fetched successfully!"
      )
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountsDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};
