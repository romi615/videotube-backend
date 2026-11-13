import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";

const getVideoComments = asyncHandler(async (req, res) => {
  //TODO: get all comments for a video
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;
});

const addComment = asyncHandler(async (req, res) => {
  // TODO: add a comment to a video

  const { videoId } = req.params;
  const { content } = req.body;

  // 1. Validation: Check if videoId is provided
  if (!videoId) {
    throw new ApiError(400, "videoId is missing");
  }

  // Check if comment content is provided and not empty
  if (!content || content.trim() === "") {
    throw new ApiError(400, "Comment content is required");
  }
  // 2. Get logged-in user id (Auth middleware required)
  const userId = req.user?._id;
  if (!userId) {
    throw new ApiError(401, "Unauthorized request");
  }

  // / 3. Check if the video exists
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  // 4. Create the comment in database
  const comment = await Comment.create({
    content,
    video: videoId,
    owner: userId,
  });

  if (!comment) {
    throw new ApiError(500, "Something went wrong while adding the comment");
  }

  // 5. Send Success Response
  return res
    .status(201)
    .json(new ApiResponse(201, comment, "Comment added successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
  // TODO: update a comment

  const { commentId } = req.params;
  const { content } = req.body;

  // 1. Validation: Check if commentId is provided
  if (!commentId) {
    throw new ApiError(400, "commentId is missing");
  }

  // Check if new content is provided and not empty
  if (!content || content.trim() === "") {
    throw new ApiError(400, "Comment content is required");
  }

  // 2. Get logged-in user id (Auth middleware required)
  const userId = req.user?._id;
  if (!userId) {
    throw new ApiError(401, "Unauthorized request");
  }

  // 3. Find the comment in database
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  // 4. Authorization: Check if the logged-in user is the owner of the comment
  if (comment.owner.toString() !== userId.toString()) {
    throw new ApiError(403, "You are not authorized to update this comment");
  }

  // 5. Update the comment content
  const updatedComment = await Comment.findByIdAndUpdate(
    commentId,
    {
      $set: {
        content,
      },
    },
    { new: true }
  );

  if (!updatedComment) {
    throw new ApiError(500, "Something went wrong while updating the comment");
  }

  // 6. Send Success Response
  return res
    .status(200)
    .json(new ApiResponse(200, updatedComment, "Comment updated successfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
  // TODO: delete a comment

  const { commentId } = req.params;

  // 1. Validation: Check if commentId is provided
  if (!commentId) {
    throw new ApiError(400, "commentId is missing");
  }

  // 2. Get logged-in user id (Auth middleware required)
  const userId = req.user?._id;
  if (!userId) {
    throw new ApiError(401, "Unauthorized request");
  }

  // 3. Find the comment in database
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  // 4. Authorization: Check if the logged-in user is the owner of the comment
  if (comment.owner.toString() !== userId.toString()) {
    throw new ApiError(403, "You are not authorized to delete this comment");
  }

  // 5. Delete the comment
  // await Comment.deleteOne({ _id: commentId });
  await Comment.findByIdAndDelete(commentId);

  // 6. Send Success Response
  return res
    .status(200)
    .json(new ApiResponse(200, { commentId }, "Comment deleted successfully!"));
});

export { getVideoComments, addComment, updateComment, deleteComment };
