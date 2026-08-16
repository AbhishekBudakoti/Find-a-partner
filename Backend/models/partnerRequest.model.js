const mongoose = require("mongoose")

const partnerRequestSchema = new mongoose.Schema({
    sender:{
        type: mongoose.Schema.Types.ObjectId,
        ref:"User",
        required: true
    },
    recipient:{
        type: mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true,
    },
    message:{
        type:String,
        trim:true,
        maxlength:[300,"Message cannot exceed 300 charachters"],
        dafault:" "
    },
    status:{
        type:String,
        enum:["pending","accepted","rejected","cancelled","expired"],
        default:"pending",
    },
    expireAt:{
        type:Date,
        required:true
    },
},
{
    timestamps:true
});

partnerRequestSchema.index({
    sender :1,
    recipient:1
}),

partnerRequestSchema.index({
    recipient:1,
    status:1
});

const PartnerRequest = mongoose.model("PatnerRequest",partnerRequestSchema);

module.exports = PartnerRequest;

