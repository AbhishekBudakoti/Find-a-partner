const mongoose=require('mongoose')

const userSchema=new mongoose.Schema({
    name:{
        type:String,
        required:[true,"Name is required"],
        trim:true,
        minlength:[2,"Name must be at least two charachters"],
        maxlength:[50,"Name cannot exceed 50 charchters"]

    },
    email:{
        type:String,
        required:[true,"Email is required"],
        unique:true,
        lowercase:true,
        trim:true
    },
    password:{
        type:String,
        required:[true,"Password is required"],
        minlength:[6,"Password must at least 6 charchters"]
    },
    role:{
        type:String,
        enum:["user","admin"],
        default:"user"
    },
    isVerified:{
        type:Boolean,
        default:false
    }
},{timestamps:true})

const User=mongoose.model("User",userSchema)

module.exports=User;