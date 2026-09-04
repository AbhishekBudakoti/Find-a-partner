const mongoose = require('mongoose')


const profileSchema=new mongoose.Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true,
        unique:true
    },
    avatar:{
        type:String,
        default:""
    },
    bio:{
        type:String,
        trim:true,
        maxlength:[200,"Bio cannot exceed 200 charchters"],
        default:""
    },
    activities:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"Activity"
        }
    ],
    skillLevel:{
        type:String,
        enum:["beginner", "intermediate", "advanced"],
        default:"beginner"
    },

    availability:{
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
                endTime:{
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
            default:"",
        },
        coordinates:{
            type:[Number],
            default:undefined
        },

 
    },

           averageRating: {
  type: Number,
  min: 0,
  max: 5,
  default: 0,
},

ratingCount: {
  type: Number,
  min: 0,
  default: 0,
},
},
{
    timestamps:true,
});

const Profile=mongoose.model("Profile",profileSchema)

module.exports=Profile;