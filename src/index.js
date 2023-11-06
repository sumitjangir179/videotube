import dotenv from 'dotenv'
import connetDB from './db/index.js'
import app from './app.js'
dotenv.config({ path: './env' })

connetDB().then(() => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server listen on port ${process.env.PORT || 8000}`)
    })
}).catch((error) => {
    console.log(`Database connection error ${error.message}`)
})
