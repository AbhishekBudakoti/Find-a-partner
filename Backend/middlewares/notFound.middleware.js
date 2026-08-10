const notFound=(req,res)=>{
    res.status(400).json({
        success:false,
        message:`Route not found${req.method} ${req.orignalUrl}`
    })

}

module.exports=notFound


// Now if somebody requests:

// GET /api/hello

// when that route doesn't exist, they'll receive a proper JSON response instead of an Express default page.