import asyncHandler from "../utils/asyncHandler.js";
import { Video } from '../models/video.model.js'
import ApiError from "../utils/ApiError.js";
import { fileUpload } from "../utils/fileUpload.js";
import ApiResponse from "../utils/ApiResponse.js";


const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body

    if (!(title && description)) {
        throw new ApiError(400, 'all fileds are required')
    }

    const videoLocalPath = req.files?.videoFile[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path;

    if (!videoLocalPath) {
        throw new ApiError(400, 'video path is required')
    }

    if (!thumbnailLocalPath) {
        throw new ApiError(400, 'thumbnail path is required')
    }

    const videoFile = await fileUpload(videoLocalPath)
    const thumbnail = await fileUpload(thumbnailLocalPath)

    const video = await Video.create({ videoFile: videoFile.url, thumbnail: thumbnail.url, title, description, duration: videoFile.duration, owner: req.user._id })

    const publishVideo = await Video.findById(video._id)

    if (!publishVideo) {
        throw new ApiError(500, "something went wrong while uploading video")
    }

    return res.status(201).json(new ApiResponse(200, publishVideo, "video uploaded successfully"))
})

export { publishAVideo }