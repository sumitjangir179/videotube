import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { fileUpload } from "../utils/fileUpload.js";
import ApiResponse from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const genrateAccessAndRefreshTokens = async (userid) => {
    try {
        const user = await User.findById(userid);
        const accessToken = user.genrateAccessToken();
        const refreshToken = user.genrateRefreshToken();
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });
        return { accessToken, refreshToken };
    } catch (error) {
        console.log(error.message)
        throw new ApiError(500, "Something went wrong while genrating access and refresh token");
    }
};

const registerUser = asyncHandler(async (req, res) => {
    const { fullName, email, userName, password } = req.body;

    if (
        [fullName, email, userName, password].some((filed) => filed?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required");
    }

    const existedUser = await User.findOne({ $or: [{ userName }, { email }] });

    if (existedUser) {
        throw new ApiError(409, "User this email or userName already exists ");
    }

    // const coverImageLoaclPath = req.files?.coverImage[0]?.path
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    const avatarLoaclPath = req.files?.avatar[0]?.path;
    if (!avatarLoaclPath) {
        throw new ApiError(400, "Avatar field is required");
    }

    const avatar = await fileUpload(avatarLoaclPath);
    const coverImage = await fileUpload(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(400, "Avatar field is required 1");
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        userName: userName.toLowerCase(),
    });

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while creating an User");
    }

    return res
        .status(201)
        .json(new ApiResponse(200, createdUser, "User registerd successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
    const { email, userName, password } = req.body;

    if (!(email || userName)) {
        throw new ApiError(400, "username and email is required");
    }

    //Alternate of above code
    // if (!email && !userName)) {
    //     throw new ApiError(400, "username and email is required");
    // }

    const user = await User.findOne({ $or: [{ email }, { userName }] });

    if (!user) {
        throw new ApiError(404, "User does not exists");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials");
    }

    const { accessToken, refreshToken } = await genrateAccessAndRefreshTokens(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = { httpOnly: true, secure: true };

    return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options).json(new ApiResponse(200, { user: loggedInUser, accessToken, refreshToken }, "User loggedIn successfully"));
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, { $set: { refreshToken: undefined } }, { new: true })
    const options = { httpOnly: true, secure: true }
    res.status(200).clearCookie('accessToken', options).clearCookie("refreshToken", options).json(new ApiResponse(200, {}, 'User logout successfully'))
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

        const user = await User.findById(decodedToken._id)

        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
        }

        const options = { httpOnly: true, secure: true }

        const { accessToken, newRefreshToken } = await genrateAccessAndRefreshTokens(user._id)

        return res.status(200).cookie('accessToken', accessToken, options).cookie('refreshToken', newRefreshToken, options).json(new ApiResponse(200, { accessToken, refreshToken: newRefreshToken }, "Access token refreshed"))

    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }

});

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body

    const user = await User.findById(req.user?._id)

    if (!user) {
        throw new ApiError(400, "Invalid old password")
    }

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password")
    }

    user.password = newPassword

    await user.save({ validateBeforeSave: false })

    return res.status(200).json(new ApiResponse(201, {}, 'Password change successfully'))


});

const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json(new ApiResponse(201, req.user, "User fetch successfully"))
});

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body

    if (!fullName || !email) {
        throw new ApiError(400, 'All fields are required')
    }

    const user = await User.findByIdAndUpdate(req.user?._id, { $set: { fullName: fullName, email: email } }, { new: true }).select('-password')

    return res.status(201).json(new ApiResponse(201, user, 'User information update succssfully'))
});

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLoaclPath = req.file?.path

    if (!avatarLoaclPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    const avatar = await fileUpload(avatarLoaclPath)

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading on avatar")
    }

    const user = await User.findByIdAndUpdate(req.user?._id, { $set: { avatar: avatar.url } }, { new: true })

    return res.status(201).json(new ApiResponse(200, user, "Avatar image updated successfully"))


});

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLoaclPath = req.file?.path

    if (!coverImageLoaclPath) {
        throw new ApiError(400, "Cover image file is missing")
    }

    const coverImage = await fileUpload(coverImageLoaclPath)

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading on cover image")
    }

    const user = await User.findByIdAndUpdate(req.user?._id, { $set: { coverImage: coverImage.url } }, { new: true })

    return res.status(201).json(new ApiResponse(200, user, "Cover image updated successfully"))


});

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { userName } = req.params

    if (!userName) {
        throw new ApiError(400, 'Username is missing')
    }

    //return an array 
    const channel = await User.aggregate([
        { $match: { userName: userName?.toLowerCase() } },
        { $lookup: { from: 'subscriptions', localField: '_id', foreginField: 'channel', as: 'subscribers' } },
        { $lookup: { from: 'subscriptions', localField: '_id', foreginField: 'subscriber', as: 'subscribedTo' } },
        {
            $addFields:
            {
                subscriberCount: { $size: "$subscribers" },
                channelIsSubscribedToCount: { $size: '$subscribedTo' },
                isSubscribed: {
                    $cond: {
                        if: {
                            $in: [req.user?._id, '$subscribers.subscriber'],
                            then: true,
                            else: false
                        }
                    }
                }
            }
        },
        { '$project': { fullName: 1, userName: 1, subscriberCount: 1, channelIsSubscribedToCount: 1, isSubscribed: 1, avatar: 1, coverImage: 1, email: 1 } }
    ])


    if (!channel?.length) {
        throw new ApiError(404, 'Channel does not exist')
    }

    return res.status(200).json(new ApiResponse(200, channel[0], 'User channel fetched successfully'))
});

const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: { _id: new mongoose.Types.ObjectId(req.user._id) }
        },
        {
            $lookup: {
                from: 'videos',
                localField: 'watchHistory',
                foreginField: '_id',
                as: 'watchHistory',
                pipeline: [
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'owner',
                            foreginField: '_id',
                            as: 'owner',
                            pipeline: [{ $project: { fullName: 1, userName: 1, avatar: 1 } }]
                        },
                    },
                    {
                        $addFields: {
                            owner: { $first: '$owner' }
                        }
                    }
                ]
            }

        }
    ])

    return res.status(200).json(new ApiResponse(200, user[0].watchHistory, 'Watched history fetched successfully'))
});
export { registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage, getUserChannelProfile, getWatchHistory };
