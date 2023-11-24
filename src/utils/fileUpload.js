import { v2 as cloudinary } from 'cloudinary'
import fs from 'fs'

cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_SECRET_KEY })

const fileUpload = async (localFilePath) => {
    try {
        if (!localFilePath) return null
        //upload file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, { resource_type: 'auto' })
        //file has been uploaded
        // console.log(`File has been uploaded ${response.url}`)
        fs.unlinkSync(localFilePath)
        return response
    } catch (error) {
        //remove the locally saved temp file as the upload operation got failed
        fs.unlinkSync(localFilePath)
        console.log(`Error in file upload ${error.message}`)
        return null
    }
}

export { fileUpload }