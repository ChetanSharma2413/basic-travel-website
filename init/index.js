const mongoose = require("mongoose");
const initData  = require("./data.js");
const Listing = require("../models/listing.js");

const MONGO_URL = "mongodb://127.0.0.1:27017/travel-website";

main()
    .then( () => {
        console.log("Connected to DB");
    } )
    .catch( (err) => {
        console.log(`There are some error `);
    })

async function main() {
  await mongoose.connect(MONGO_URL);
  await initDB();
}

const initDB = async() => {
    await Listing.deleteMany({});
    initData.data = initData.data.map((obj)=>( {...obj}));
    await Listing.insertMany(initData.data);
    console.log("Data was initialized");
};
