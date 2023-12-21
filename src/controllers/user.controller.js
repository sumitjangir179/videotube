import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { fileUpload } from "../utils/fileUpload.js";
import ApiResponse from "../utils/ApiResponse.js";

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
    console.log(req.files)
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }
    console.log(req.files)
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
export { registerUser, loginUser, logoutUser };
