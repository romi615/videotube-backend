import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  //TODO: get all videos based on query, sort, pagination
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if (!title || !description) {
    throw new ApiError(400, "Title and description are required");
  }

  const videoFileLocalPath = req.files?.videoFile?.[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

  if (!videoFileLocalPath) {
    throw new ApiError(400, "video file is required");
  }

  if (!thumbnailLocalPath) {
    throw new ApiError(400, "Thumbnail is required");
  }

  const videoFile = await uploadOnCloudinary(videoFileLocalPath);
  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  if (!videoFile) {
    throw new ApiError(400, "Failed to upload video file to Cloudinary");
  }

  if (!thumbnail) {
    throw new ApiError(400, "Failed to upload thumbnail to Cloudinary");
  }

  const video = await Video.create({
    title,
    description,
    videoFile: videoFile.url,
    videoFilePublicId: videoFile.public_id,
    thumbnail: thumbnail.url,
    thumbnailPublicId: thumbnail.public_id,
    duration: videoFile.duration || 0,
    owner: req.user?._id,
    isPublished: true,
  });

  const createdVideo = await Video.findById(video._id);

  if (!createdVideo) {
    throw new ApiError(500, "something went wrong while publishing video");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, createdVideo, "Video published successfully!"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video ID format");
  }

  const video = await Video.findById(videoId).populate(
    "owner",
    "fullname username avatar"
  );

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video fetched successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video ID format");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(403, "You are not authorized to update this video");
  }

  const thumbnailLocalPath = req.file?.path || req.files?.thumbnail?.[0]?.path;

  let uploadedThumbnail;
  if (thumbnailLocalPath) {
    uploadedThumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    if (!uploadedThumbnail?.url) {
      throw new ApiError(400, "Failed to upload new thumbnail");
    }
  }

  const updateFields = {
    title: title || video.title,
    description: description || video.description,
  };

  if (uploadedThumbnail) {
    updateFields.thumbnail = uploadedThumbnail.url;
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: updateFields,
    },
    { new: true }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedVideo, "Video details updated successfully!")
    );
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video ID format");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(403, "You are not authorized to delete this video");
  }

  await deleteFromCloudinary(video.videoFilePublicId, "video");
  await deleteFromCloudinary(video.thumbnailPublicId, "image");

  // const deletedVideo = await Video.deleteOne({ _id: videoId });
  await Video.findByIdAndDelete(videoId);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video deleted successfully!"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video ID format");
  }

  // 1. Video dhoondo
  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  // 2. Ownership check
  if (video.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(
      403,
      "You are not authorized to change this video's status"
    );
  }

  // 3. Status ko toggle kar do (true ko false, false ko true)
  video.isPublished = !video.isPublished;

  // 4. Save changes to DB
  await video.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { isPublished: video.isPublished },
        `Video publish status updated to ${video.isPublished ? "Public" : "Private"}`
      )
    );
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
