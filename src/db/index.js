import mongoose from 'mongoose'
import { DB_NAME } from '../constants.js'

const connetDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
        console.log(`DB connected ${connectionInstance.connection.host}`)
    } catch (error) {
        console.log(`Error in DB connection ${error.message}`)
        process.exit(1)
    }
}

export default connetDB