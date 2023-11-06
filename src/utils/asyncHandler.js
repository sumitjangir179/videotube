// const asyncHandler = (func) => async () => {
//     try {
//         await func()
//     } catch (error) {
//         res.status(error.code || 5000).json({ success: false, message: error.message })
//     }
// }

const asyncHandler = (requestHandler) => {
    (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err.message))
    }
}

export default asyncHandler

// const asyncHandler = () => {}
// const asyncHandler = (func) => () => {}
// const asyncHandler = (func) => async () => {}