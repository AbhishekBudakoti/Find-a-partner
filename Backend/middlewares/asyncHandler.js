const asyncHandler=(controller)=>{
    return(req,res,next)=>{
        Promise.resolve(controller(req,res,next)).catch(next)
    }

}

module.exports=asyncHandler;


// This will automatically send asynchronous errors to our global error middleware.
// Instead of doing this everywhere:

// try {
//    // code
// } catch (error) {
//    next(error);