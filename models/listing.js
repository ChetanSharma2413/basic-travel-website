const mongoose = require("mongoose");
const Review = require("./review.js");

const listingSchema = new mongoose.Schema({
    title : {
        type : String , 
        required : true,
    },
    description : {
        type : String,
        required : true,
    },
    image : {
        filename : {
            type : String,
        },
        url : {
            type : String,
        }
    },
    price : {
        type : Number,
    },
    location : {
        type : String,
    },
    country : {
        type : String,
    },
    owner : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "User"
    },
    reviews : [
        {
        type : mongoose.Schema.Types.ObjectId,
        ref : "Review",
        }
    ],
})

listingSchema.post("findOneAndDelete" , async(listing) => {
    if(listing) {
        await Review.deleteMany({_id : {$in : listing.reviews}});
    }
})

const Listing = mongoose.model("Listing" , listingSchema);
module.exports = Listing;