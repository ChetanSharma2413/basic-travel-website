const express = require("express");
const app = express();
const path = require("path");
const mongoose = require("mongoose");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "/public")));
const session = require("express-session");
const MongoStore = require("connect-mongo").default;
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");
// const Schema = require("/schema.js")

const Listing = require("./models/listing.js");
const Review = require("./models/review.js");
const wrapAsync = require("./utils/wrapAsync.js");
const ExpressError = require("./utils/ExpressError.js");

const {
  validateListing,
  isLoggedIn,
  saveRedirectUrl,
  isOwner,
  validateReview,
  isReviewAuthor
} = require("./middleware.js");

//-------------------------------------1 Database Connection--------------------------------------------
//Connection to database
const dbURL = "mongodb://127.0.0.1:27017/travel-website";
main()
  .then(() => {
    console.log("Connected to DB");
  })
  .catch((e) => {
    console.log(`There are some error ${e} `);
  });

async function main() {
  await mongoose.connect(dbURL);
}
//----------------------------------------1-----------------------------------------

const sessionOptions = {
  store: MongoStore.create({
    mongoUrl: dbURL,
    crypto: {
      secret: "secret-code",
    },
    touchAfter: 24 * 3600,
  }),
  secret: "secret-code",
  resave: false,
  saveUninitialized: true,
  cookie: {
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  },
};

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currUser = req.user;
  next();
});

app.get("/", (req, res) => {
  res.send("Hi, i am root.");
});

//index Route
app.get(
  "/listings",
  wrapAsync(async (req, res) => {
    const listings = await Listing.find({}); //return an array of listing
    res.render("listings/index.ejs", { listings });
  }),
);

//New Route
app.get("/listings/new", isLoggedIn, (req, res) => {
  res.render("listings/new.ejs");
});

//show Route
app.get(
  "/listings/:id",
  wrapAsync(async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id)
    .populate({
        path: "reviews",
        populate: {
            path: "author"
        } 
    })
    .populate("owner");
    res.render("listings/show.ejs", { listing });
  }),
);

//Create Route
app.post(
  "/listings",
  isLoggedIn,
  validateListing,
  wrapAsync(async (req, res) => {
    const url = req.body.listing.image.url;
    const filename = "listingimage"; // temperory for managing the database data as same
    const listing = req.body.listing;
    const newListing = new Listing(listing);
    newListing.image = { url, filename };
    newListing.owner = req.user._id;
    await newListing.save();
    console.log("New Listing Created");
    req.flash("success", "Listing Created");
    res.redirect("/listings");
  }),
);

//Edit Route
app.get(
  "/listings/:id/edit",
  isLoggedIn,
  isOwner,
  wrapAsync(async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id);
    res.render("listings/edit.ejs", { listing });
  }),
);

//Update Route
app.put(
  "/listings/:id",
  isLoggedIn,
  isOwner,
  validateListing,
  wrapAsync(async (req, res) => {
    const url = req.body.listing.image.url;
    const filename = "listingimage"; // temperory for managing the database data as same
    const { id } = req.params;
    const listing = await Listing.findById(id);
    const newListing = req.body.listing;
    newListing.image = { url, filename };
    Object.assign(listing, newListing);
    await listing.save();
    res.redirect(`/listings/${id}`);
  }),
);

//Delete Route
app.delete(
  "/listings/:id",
  isLoggedIn,
  isOwner,
  wrapAsync(async (req, res) => {
    const { id } = req.params;
    const deletedListing = await Listing.findByIdAndDelete(id);
    console.log(` deleted listing is :-  ${deletedListing}`);
    req.flash("success", "Listing Deleted");
    res.redirect(`/listings`);
  }),
);

//Sign up render form
app.get("/signup", (req, res, next) => {
  res.render("users/signup.ejs");
});

//Sign up post form
app.post(
  "/signup",
  wrapAsync(async (req, res, next) => {
    const { username, email, password } = req.body;
    const user = new User({ username, email });
    //Register hashes the password and saves the user
    const registeredUser = await User.register(user, password);
    req.login(registeredUser, (err) => {
      if (err) {
        return next(err);
      } else {
        req.flash("success", "Welcome to Wanderlust! ");
        res.redirect("/listings");
        console.log("Login Succesful");
      }
    });
    console.log(
      `${username} and its email is ${email} and password is ${password}`,
    );
  }),
);

//login render form
app.get("/login", (req, res, next) => {
  res.render("users/login.ejs");
});

//login post request
app.post(
  "/login",
  saveRedirectUrl,
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  async (req, res, next) => {
    req.flash("success", "Welcome Back");
    let redirectUrl = res.locals.redirectUrl || "/listings";
    res.redirect(redirectUrl);
  },
);

// logout route
app.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    req.flash("success", "Logout Done! ");
    res.redirect("/listings");
    console.log("LogOut Done");
  });
});

// Create Review Route
app.post("/listings/:id/reviews", isLoggedIn, validateReview , async(req, res, next) => {
  let listing = await Listing.findById(req.params.id);
  let newReview = new Review(req.body.review);
  newReview.author = req.user._id;
  listing.reviews.push(newReview);

  await newReview.save();
  await listing.save();

  req.flash("success" , "New Review Created");
  res.redirect(`/listings/${listing._id}`);
});

//Delete a Review Route
app.delete("/listings/:id/reviews/:reviewId",isLoggedIn , isReviewAuthor , async(req, res, next) => {
  let {id , reviewId } = req.params;
  await Listing.findByIdAndUpdate(id , {$pull: {reviews:reviewId}});
  await Review.findByIdAndDelete(reviewId);

  req.flash("success" , "Review Deleted");
  res.redirect(`/listings/${id}`);
});

//Catch all Route
app.all(/.*/, (req, res, next) => {
  next(new ExpressError(404, "Page Not Found"));
});

//Global error handler Middleware
app.use((err, req, res, next) => {
  let { statusCode = 500, message = "Something went wrong!" } = err;
  res.status(statusCode).render("error.ejs", { message });
});

app.listen(8080, () => {
  console.log("Server is listening at port 8080");
});
