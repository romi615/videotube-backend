import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { Video } from "../models/video.model.js";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: toggle like on video

  if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid or missing videoId");
  }

  const userId = req.user?._id;
  if (!userId) {
    throw new ApiError(401, "Unauthorized request");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  const existingVideoLike = await Like.findOne({
    video: videoId,
    likedBy: userId,
  });

  if (existingVideoLike) {
    await Like.findByIdAndDelete(existingVideoLike._id);

    return res
      .status(200)
      .json(new ApiResponse(200, { liked: false }, "Unliked successfully"));
  } else {
    await Like.create({
      video: videoId,
      likedBy: userId,
    });

    return res
      .status(200)
      .json(new ApiResponse(200, { liked: true }, "Liked successfully"));
  }
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  //TODO: toggle like on comment

  if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "Invalid or missing commentId");
  }

  const userId = req.user?._id;
  if (!userId) {
    throw new ApiError(401, "Unauthorized request");
  }

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  const existingCommentLike = await Like.findOne({
    comment: commentId,
    likedBy: userId,
  });

  if (existingCommentLike) {
    await Like.findByIdAndDelete(existingCommentLike._id);

    return res
      .status(200)
      .json(new ApiResponse(200, { liked: false }, "Unliked successfully"));
  } else {
    await Like.create({
      comment: commentId,
      likedBy: userId,
    });

    return res
      .status(200)
      .json(new ApiResponse(200, { liked: true }, "Liked successfully"));
  }
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  //TODO: toggle like on tweet
});

const getLikedVideos = asyncHandler(async (req, res) => {
  //TODO: get all liked videos
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
