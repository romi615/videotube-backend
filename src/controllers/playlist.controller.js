import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  // 1. Validate name
  if (!name || name.trim() === "") {
    throw new ApiError(400, "Playlist name is required");
  }

  // 2. Validate description
  if (!description || description.trim() === "") {
    throw new ApiError(400, "Playlist description is required");
  }

  // 3. Verify authenticated user
  const userId = req.user?._id;
  if (!userId) {
    throw new ApiError(401, "Unauthorized request");
  }

  // 4. Create playlist in MongoDB
  const playlist = await Playlist.create({
    name: name.trim(),
    description: description.trim(),
    owner: userId,
  });

  if (!playlist) {
    throw new ApiError(500, "Something went wrong while creating the playlist");
  }

  // 5. Send success response
  return res
    .status(201)
    .json(new ApiResponse(201, playlist, "Playlist created successfully"));
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // 1. Check if userId is provided
  if (!userId) {
    throw new ApiError(400, "userId is missing");
  }

  // 2. Validate if userId is a valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid userId format");
  }

  // 3. Fetch playlists belonging to the user from the database
  const playlists = await Playlist.find({ owner: userId });

  // Optional: check if you want to handle empty playlists or just return an empty array (an empty array is standard and valid)

  // 4. Send success response
  return res
    .status(200)
    .json(
      new ApiResponse(200, playlists, "User playlists fetched successfully")
    );
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  //TODO: get playlist by id

  // 1. Check if playlistId is provided
  if (!playlistId) {
    throw new ApiError(400, "playlistId is missing");
  }

  // 2. Validate if playlistId is a valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new ApiError(400, "Invalid playlistId format");
  }

  // 3. Fetch playlist by ID and populate its videos (if applicable)
  const playlist = await Playlist.findById(playlistId).populate("videos");

  // 4. Check if the playlist actually exists in the database
  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  // 5. Send success response
  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist fetched successfully"));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  // TODO: remove video from playlist
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  // TODO: delete playlist
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;
  //TODO: update playlist
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
