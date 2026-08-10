const express = require('express')
const cors=require('cors')
const cookieParser=require('cookie-parser')

const apiRoutes=require('./routes')
const notFound=require('./middlewares/notFound.middleware')
const errorHandler=require('./middlewares/error.midlleware')

const app=express()
//cors
app.use(
    cors({
        origin:process.env.CLIENT_URL||"http://localhost:5173",
        credentials:true
    })
);

//body parser
app.use(express.json())
app.use(express.urlencoded({extended:true}))

//cookie-parser
app.use(cookieParser())


//API routes
app.use('/api',apiRoutes)

//404 handler
app.use(notFound)

//Global errorhandler
app.use(errorHandler)



module.exports=app;