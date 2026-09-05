const  mongoose=require('mongoose')

const notificationSchema =new mongoose.Schema({
    recipient:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required: true
    },

    sender:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        default: null
    },

    type:{
        type:String,
        enum:[
            "partner_request",
            "request_accepted",
            "request_rejected",
            "request_cancelled",
            "match_created",
            "session_proposed",
            "session_accepted",
            "session_rejected",
            "session_cancelled",
            "session_reminder"
        ],
        required:true,
    },

    message:{ 
        type:String,
        required: true,
        trim:true,
        maxlength:300
    },

    relatedRequest:{
        type: mongoose.Schema.Types.ObjectId,
        ref:"PartnerRequest",
        default:null
    },
    relatedMatch:{
        type: mongoose.Schema.Types.ObjectId,
        ref:"Match",
        default:null        
    },
    relatedSession:{
        type: mongoose.Schema.Types.ObjectId,
        ref:"Session",
        default:null        
    },
    isRead:{
        type:Boolean,
        default:false
    },},
{
     timestamps: true,
})


module.exports = mongoose.model(
    "Notification",
    notificationSchema
);