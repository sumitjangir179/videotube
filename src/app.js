import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'

const app = express()

app.use(cors({ origin: process.env.CORS_ORIGIN, credential: true }))
app.use(express.json({ limit: '20kb' }))
app.use(express.urlencoded({ extended: true, limit: '16kb' }))
app.use(express.static('public'))
app.use(cookieParser())

//router import
import userRouter from './routes/user.router.js'
//user route declaration
app.use('/api/v1/users', userRouter)

export default app