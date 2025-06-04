
require('dotenv').config()
const express =require('express')
const cors=require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt=require('jsonwebtoken')
const cookieParser=require('cookie-parser')
const port =process.env.PORT || 4000
const app=express()

//middle ware
app.use(cors({
  origin:['http://localhost:5173','https://subtle-speculoos-5d599c.netlify.app'],
  credentials:true
}))
app.use(express.json())
app.use(cookieParser())

const logger=(req,res,next)=>{
  // console.log('inside the logger middleware');
  next()
}

const verifyToken=(req,res,next)=>{
  const token=req?.cookies?.token
  // console.log('cookie in the middleware ',token);
  if(!token){
    return res.status(401).send({message:'unauthorized'})
  }
  //? verify token \\
  jwt.verify(token,process.env.JWT_ACCESS_SECRET,(err,decoded)=>{
    if(err){
      return res.status(401).send({message:'unauthorized'})
    }
    req.decoded=decoded;
    next()
  })

}



const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASS}@cluster0.dgbpvrt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;


const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // await client.connect();
    const jobCollection= client.db("jobDB").collection("job")
    const applyCollection=client.db("applyDB").collection("apply")

    //! jwt token related API
    app.post('/jwt',async(req,res)=>{
      // const {email}=req.body
      const user=req.body
      const token=jwt.sign(user,process.env.JWT_ACCESS_SECRET,{expiresIn:"1d"})
     
      res.cookie('token',token,{
        httpOnly:true,
        secure:true,
        sameSite:'none'
      })
      res.send({success:true})
    })

// ! get all job and 

    app.get("/jobPortal",async(req,res)=>{
      
      const email=req.query.email;
      const query={}
      if(email){
        query.hr_email=email;
      }
        const result=await jobCollection.find(query).toArray()
        res.send(result)
    })

  // ! job 
     app.get("/jobPortal/applications",async(req,res)=>{
      const email = req.query.email;
      const query={hr_email:email}
      const jobs= await jobCollection.find(query).toArray()

      //* 
      for(const job of jobs){
        const applicationQuery= {jobId: job._id.toString()}
        const application_count= await applyCollection.countDocuments(applicationQuery)
        job.application_count=application_count;
      }
      res.send(jobs)
     })


// ! get details job
    app.get("/jobPortal/:id",async(req,res)=>{
      const id= req.params.id 
      const query={_id: new ObjectId(id)}
      const result=await jobCollection.findOne(query)
      res.send(result)
    })
 // ! post   job 
     app.post('/jobPortal',async(req,res)=>{
      const newJob=req.body
      const result=await jobCollection.insertOne(newJob)
      res.send(result)
     })
   

    
    //? application  get  and my application 
    app.get('/applications',logger,verifyToken, async(req,res)=>{
      const email=req.query.email
      // console.log('inside applications api',req.cookies);

      if(email!==req.decoded.email){
        return res.status(403).send({message:'forbidden access'})
      }

      const query={
        application:email
      }
      const result=await applyCollection.find(query).toArray()

      for(const application of result){
        const jobId=application.jobId;
        const jobQuery={_id: new ObjectId(jobId)}
        const job=await jobCollection.findOne(jobQuery);
        application.company=job.company;
        application.title=job.title;
        application.company_logo=job.company_logo;
      }
      res.send(result)
    })
    // ? application details
    app.get('/applications/job/:Job_id',async(req,res)=>{
      const job_id=req.params.Job_id;
      const query= {jobId: job_id}
      const result= await applyCollection.find(query).toArray()
      res.send(result)

    })

    //? application  post 
    app.post("/applications",async(req,res)=>{
      const query=req.body
      const result= await applyCollection.insertOne(query)
      res.send(result)
    })

    //? application patch 
    app.patch("/applications/:id",async(req,res)=>{
      const id =req.params.id
      const filter={_id: new ObjectId(id)}
      const updateDoc={
        $set:{
          status: req.body.status
        }
      }
      const result= await applyCollection.updateOne(filter, updateDoc)
      res.send(result)
    })
   
    
   
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {

 
  }
}
run().catch(console.dir);


// app.get("/",(req,res)=>{
//     res.send('this is the job portal ');
// })

app.listen(port,()=>{
    console.log(` the port in running on ${port}`);
})
