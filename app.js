const express = require("express");
const app = express();
const path = require("path");
const mongoose = require("mongoose");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
app.engine('ejs', ejsMate);
app.set("view engine" , "ejs");
app.set("views" , path.join(__dirname , "views"));
app.use(express.urlencoded({extended:true}));
app.use(express.json());
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname , "/public")));


const Listing = require("./models/listing.js");
const wrapAsync = require("./utils/wrapAsync.js");
const ExpressError = require("./utils/ExpressError.js");
const {listingSchema}= require("./schema.js");
const validateListing = require("./middleware.js")


//-------------------------------------1 Database Connection--------------------------------------------
//Connection to database
const dbURL = 'mongodb://127.0.0.1:27017/travel-website'
main()
    .then( () => {
        console.log("Connected to DB");
    } )
    .catch( (e) => {
        console.log(`There are some error ${e} `);
    })

async function main() {
  await mongoose.connect(dbURL);
}
//----------------------------------------1-----------------------------------------

app.get("/" , (req, res) => {
    res.send("Hi, i am root.");
})

//index Route
app.get("/listings", wrapAsync(async(req, res) => {
    const listings = await(Listing.find({}));  //return an array of listing
    res.render("listings/index.ejs" , {listings});
}));

//New Route
app.get("/listings/new" , (req, res) => {
    res.render("listings/new.ejs");
})

//show Route
app.get("/listings/:id" , wrapAsync(async(req, res) => {
    let {id} = req.params;
    const listing = await Listing.findById(id);
    res.render("listings/show.ejs", {listing})
}));

//Create Route
app.post("/listings" , validateListing ,wrapAsync(async(req, res) => {
    const url = req.body.listing.image.url;
    const filename = "listingimage" ; // temperory for managing the database data as same
    const listing = req.body.listing;
    const newListing = new Listing(listing);
    newListing.image = {url , filename};
    await newListing.save();
    console.log("New Listing Created");
    res.redirect("/listings");
}));

//Edit Route
app.get("/listings/:id/edit" , wrapAsync(async(req, res) => {
    const {id} = req.params;
    const listing = await Listing.findById(id);
    res.render("listings/edit.ejs" , {listing});
}));

//Update Route
app.put("/listings/:id" , validateListing ,  wrapAsync(async(req, res) =>{
    const url = req.body.listing.image.url;
    const filename = "listingimage" ; // temperory for managing the database data as same
    const {id }= req.params;
    const listing = await Listing.findById(id);
    const newListing = req.body.listing;
    newListing.image = {url , filename};
    Object.assign(listing , newListing);
    await listing.save();
    res.redirect(`/listings/${id}`);
}));

//Delete Route
app.delete("/listings/:id" , wrapAsync(async(req, res) =>{
    const {id }= req.params;
    const deletedListing = await Listing.findByIdAndDelete(id);
    console.log(` deleted listing is :-  ${deletedListing}`);
    res.redirect(`/listings`);
}));

//Catch all Route 
app.all(/.*/ , (req, res , next) => {
    next(new ExpressError(404, "Page Not Found"));
});

//Global error handler Middleware
app.use((err , req , res , next) => {
    let {statusCode = 500, message = "Something went wrong!"} = err;
    res.status(statusCode).render("error.ejs", { message});
});

app.listen(8080 , ()=>{
    console.log("Server is listening at port 8080");
});