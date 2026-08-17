const dotenv=require('dotenv')
dotenv.config()
const http = require('http')
const app=require('./app')
const connectDB=require('./config/db')
const initializeSocket = require("./socket/socket");

const PORT=process.env.PORT || 5000



const server= http.createServer(app);

initializeSocket(server);

const startServer=async()=>{
    try{
        await connectDB();

        server.listen(PORT,()=>{
            console.log(`Server running http://localhost:${PORT}`)
        })
    }catch(error){
        console.log(`Server setup failed ${error.message}`)
        process.exit(1)

    }
};


startServer();