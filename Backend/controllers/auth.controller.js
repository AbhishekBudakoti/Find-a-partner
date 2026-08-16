const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const User = require('../models/user.model');
const { successResponse } = require('../utils/response');


//Register user
const register=async(req,res)=>{
    const {name,email,password}=req.body;

    // Validate required fields
    if(!name||!email||!password){
        const error=new Error("Name, email and password are required")

        error.statusCode=400;
        throw error;
    }
  // Check existing user
  const existingUser= await User.findOne({email});
  if(existingUser){
    const error=new Error("User with this email already exist")
    error.statusCode = 409;
    throw error
  }

  const hashedPassword= await bcrypt.hash(password,10)

    // Create user
    const user=await User.create({
        name,
        email,
        password:hashedPassword
    });

    return successResponse(
        res,{
            user:{
                id:user._id,
                name:user.name,
                email:user.email,
                role:user.role,
            },
        },
        "User Register Successfully",
        201
    )

}


//login user
const login=async(req,res)=>{
    const {email,password}=req.body;

    if(!email||!password){
        const error=new Error("Enter the username and password")
        error.statusCode=400;
        throw error;
    }

    const user=await User.findOne({email})

    if(!user){
        const error=new Error("Invalid Username and Password")
        error.statusCode=400;
        throw error;
        
    }

    const isPasswordValid = await bcrypt.compare(password,user.password)

    if(!isPasswordValid){

              const error=new Error("Invalid Username and Password")
        error.statusCode=400;
        throw error;

    }


    const JWT_SECRET = process.env.JWT_SECRETS || process.env.JWT_SECRET || 'dev-secret-key';

    const token = jwt.sign(
        {
            id: user._id,
            role: user.role
        },
        JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN || '7d'
        }
    );

    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
    });


    return successResponse(res,{
        user:{
              id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        },
    },
 "Login successful");
};


//current user

const getCurrentUser= async (req,res)=>{

    const user= await User.findById(req.user.id).select(
        "-password"
    );

     if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  return successResponse(
    res,
    {
      user,
    },
    "Current user fetched successfully"
  );
};

//logout user

const logout=async(req,res)=>{
    res.clearCookie("token",{
        httpOnly:true,
        secure:process.env.NODE_ENV==="production",
        sameSite:process.env.NODE_ENV==="production"?"none":"lax"
    })

    return successResponse(
        res,
        {},
        "Logout Successful"
    )
}




module.exports={
    register,login,getCurrentUser,logout
}