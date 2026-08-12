const mongoose = require('mongoose')


const profileSchema=new mongoose.Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true,
        unique:true
    },
    avtar:{
        type:String,
        default:""
    },
    bio:{
        type:String,
        trim:true,
        maxlength:[200,"Bio cannot exceed 200 charchters"],
        default:""
    },
    activities:{
        type:String,
        enum:["beginner", "intermediate", "advanced"],
        default:"beginner"
    },

    availibility:{
        type:[
            {
                day:{
                    type:String,
                    enum:[
              "monday",
              "tuesday",
              "wednesday",
              "thursday",
              "friday",
              "saturday",
              "sunday",
            ],
            required: true,
                },
                startTime:{
                    type:String,
                    required:true
                },
            },
        ],
        default:[],
    },

    location:{
        city:{
            type:String,
            required:true,
            default:"",    
        },
        coordinates:{
            type:[Number],
            dafault:undefined
        },
    },
},
{
    timestamps:true,
});

const Profile=mongoose.model("Profile",profileSchema)

module.exports=Profile;