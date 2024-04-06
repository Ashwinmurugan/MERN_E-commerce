// port initialze
const port = 4000;
// express import
const express = require('express');
const app = express();
// app.use(express.json());

// mongoose
const mongoose = require('mongoose');

// JWT
const jwt=require('jsonwebtoken');

//multer
const multer=require('multer');

// path for backend dirctory
const path=require('path');

// cors
const cors = require('cors');
// app.use(cors());
// const { error } = require('console');

//USAGE for converting json req are json
app.use(express.json());
// react conecct to express
app.use(cors());

 // atlas or compass
mongoose.connect("mongodb+srv://username and password/E-commer");
mongoose.connection.on('connected', () => {
  console.log('Connected to MongoDB');
});
mongoose.connection.on('error', (err) => {
  console.error('Error connecting to MongoDB:', err);
});

app.get("/home", (req, res) => {
  res.send("Express App is Running");
});


// image storage engine
const storage=multer.diskStorage({
    destination:'./upload/images',
    filename:(req,file,cb)=>{
        return cb(null,`${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)
    }
})


//upload om obj
const upload=multer({storage:storage})
// creating upload endpoint for images
app.use('/images',express.static('upload/images'))
app.post("/upload",upload.single('product'),(req,res)=>{
    res.json({
        success:1,
        image_url:`http://localhost:${port}/images/${req.file.filename}`
    })  
})

// schema fo crating product
const Product=mongoose.model("Product",{
    id:{
        type:Number,
        required:true
    },
    name:{
        type:String,
        required:true
    },
    image:{
        type:String,
        required:true
    },
    category:{
      type:String,
      required:true
    },
    new_price:{
      type:Number,
      required:true
    },
    old_price:{
      type:Number,
      required:true
    },
    date:{
      type:Date,
      default:Date.now,
    },
    available:{
      type:Boolean,
      default:true
    }

})

// creating API for Add product
app.post('/addproduct',async (req,res)=>{
  let products = await Product.find({});
  let id;
  if(products.length>0){
    // last product alone
    let last_product_array = products.slice(-1);
    // to access one
    let last_product = last_product_array[0];
    // from that take id
    id = last_product.id+1;
  }
  else{
    id=1;
  }

  // instead of random id take befores id =>id+1
  const product = new Product({
    id:id,
    name:req.body.name,
    image:req.body.image,
    category:req.body.category,
    new_price:req.body.new_price,
    old_price:req.body.old_price,
  });
  console.log(product);
  // saving take time so use await
  await product.save();
  console.log("Saved succesfully")
  res.json({
    success:true,
    name:req.body.name,
  })
})


// creating API for deleting products
app.post('/removeproduct',async (req,res)=>{
  await Product.findOneAndDelete({id:req.body.id});
  console.log("removed");
  res.json({
    success:true,
    name:req.body.name,
  })
})


// end point API for get all products and display 
app.get('/allproducts',async(req,res)=>{
  // all prod in array
  let products = await Product.find({});
  console.log("all product is fetched");
  res.send(products);
})

// schema for creating for user model

const Users = mongoose.model('Users',{
  name:{
    type:String,
  },
  email:{
    type:String,
    unique:true,
  },
  password:{
    type:String,
  },
  cartData:{
    type:Object,
  },
  date:{
    type:Date,
    default:Date.now,
  }
})

// creating endpoint for reg ther user

app.post('/signup',async (req,res)=>{
  let check = await Users.findOne({email:req.body.email});
  if(check){
    return res.status(400).json({success:false,errors:'Existing user found with same email'})
  }
  let cart  = {};
  for (let i = 0; i < 300; i++) {
    cart[i]=0;
  }

  const user = new Users({
    name:req.body.username,
    email:req.body.email,
    password:req.body.password,
    cartData:cart,
  })
//save each user
  await user.save();

  //JWT FOR SESSION

  const data={
    user:{
      id:user.id
    }
  }
  //create token
  const token = jwt.sign(data,'secret_ecom');
  res.json({success:true,token})
})

//creating endpoint for user login

app.post("/login",async(req,res)=>{
  let user = await Users.findOne({email:req.body.email});
  if(user){
    const passCompare = req.body.password === user.password;
    if(passCompare){
      const data={
        user:{
          id:user.id
        }
      }
      const token = jwt.sign(data,'secret_ecom');
      res.json({success:true,token});
    }
    else{
      res.json({success:false,errors:"Incorrect Password"});

    }
  }
  else{
    res.json({success:false,errors:'Wrong Email Id'});
  }
})


// creating endpoint for newcollection data

app.get('/newcollections',async(req,res)=>{
  let products = await Product.find({});
  let newcollection = products.slice(1).slice(-8);
  console.log("newcollection Fetched");
  res.send(newcollection); 
})

// creting endpoint for popular in women dection
app.get('/popularinwomen',async (req,res)=>{
  let products= await Product.find({category:"women"})
  let popular_in_women = products.slice(0,4);
  console.log("popular in women is fetched");
  res.send(popular_in_women);
})

// creating the middleware for fetch user
const fetchUser=async(req,res,next)=>{
  const token =req.header('auth-token');
  if(!token){
    res.status(401).send({errors:"Please authenticate using valid login Id"})
  }
  else{
    try {
      const data = jwt.verify(token,'secret_ecom');
      req.user = data.user;
      next();
    } catch (error) {
      res.send(401).send({errors:"Please authenticate using valid Login Id"})
    }
  }
}




// creating enpoint for addcart
app.post('/addtocart',fetchUser,async(req,res)=>{
  console.log("added",req.body.itemId);

  let userData =await Users.findOne({_id:req.user.id});
  userData.cartData[req.body.itemId]+=1;
  await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData});
  res.send("Added succesfully");
})

// creing api for remocve cartdata

app.post('/removefromcart',fetchUser,async(req,res)=>{
  console.log("removed",req.body.itemId);
  let userData =await Users.findOne({_id:req.user.id});
  if(userData.cartData[req.body.itemId]>0)
  userData.cartData[req.body.itemId]-=1;
  await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData});
  res.send("Removed succesfully");
})


//creating endpoint to get cart item
app.post('.getcart',fetchUser,async(req,res)=>{
  console.log("GetCart");
  let userData = await Users.findOne({_id:req.user.id});
  res.json(userData.cartData);
})


// port listen
app.listen(port, (error) => {
  if (!error) {
    console.log("Server Running on Port " + port);
  } else {
    console.log("Error: " + error);
  }
});