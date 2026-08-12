const mongoose=require('mongoose');

const activityScema=new mongoose.Schema({
    name:{

      type: String,
      required: [true, "Activity name is required"],
      unique: true,
      trim: true,
      minlength: [2, "Activity name must be at least 2 characters"],
      maxlength: [50, "Activity name cannot exceed 50 characters"],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [300, "Description cannot exceed 300 characters"],
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
    }
},{timestamps:true})


activitySchem.pre("save",function(next){
    if(this.isModified("name")){
        this.name=this.name.charAt(0).toUpperCase()+
        this.name.slice(1).toLowerCase()
    }
    next()
})

const Activity=mongoose.model("Avtivity",activityScema)

module.exports=Activity;