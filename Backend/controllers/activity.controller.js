const Activity=require("../models/activity.model")

const {successResponse}=require("../utils/response")


const createActivity = async (req,res) =>{
    const {name,description}=req.body;

    if(!name){
        const error=new Error("Activity name is required");
        error.statusCode=400;
        throw error;
    }

    const existingActivity = await Activity.findOne({name:name.trim()})

    if(existingActivity){
        const error =new Error("Activity already exist")
        error.statusCode = 409;
        throw error;
    }

    const activity = await Activity.create({  
        name:name.trim(),
        description,
        })


        return successResponse(
            res,{activity},"Activity created succesfuly"
        )


};

const getActivity = async(req,res) =>{
    const activities = await Activity.find({
        isActive:true
    }).sort({name:1})

    return successResponse(
        res,{activities},"Activities fetched successfully"
    )
};

module.exports= {createActivity,getActivity}