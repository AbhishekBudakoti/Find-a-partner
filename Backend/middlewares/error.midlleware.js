const errorHandler=(err,re,res,next)=>{
    console.log(eroe)

    const statusCode=err.statuCode ||500

    err.staus(statusCode).json({
        success:false,
        message:err.message||"internal Error Error"
    })
}

module.exports= errorHandler;

// This gives us one central place for API errors.
// when we build authentication, validation, matching, chat, etc., errors can flow into this middleware.