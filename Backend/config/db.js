const mongoose=require('mongoose')

const connectDB =async()=>{

    try{
        const connection= await mongoose.connect(process.env.MONGO_URL)
        console.log(`MongoDB connect to ${connection.connection.host}`)    }
        catch(error)
        {
            console.error(`MongoDB connection Failed ${error.message}`)
            process.exit(1)
        }

}

module.exports=connectDB