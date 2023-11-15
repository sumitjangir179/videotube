import { v2 as cloudinary } from 'cloudinary'
import fs from 'fs'

cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_SECRET_KEY })

async function fileUpload(localFilePath) {
    try {
        if (!localFilePath) return null
        //upload file on cloudinary
        const response = await cloudinary.v2.uploader.upload(localFilePath, { resource_type: 'auto' })
        //file has been uploaded
        console.log(`File has been uploaded ${response.url}`)
        return response
    } catch (error) {
        //remove the locally saved temp file as the upload operation got failed
        fs.unlinkSync(localFilePath)
        return null
    }
}

export default fileUpload