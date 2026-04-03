const listingSchema = require("./schema.js");
const ExpressError = require("./utils/ExpressError");

let validateListing = (req, res, next) => {
    let {error} = listingSchema.validate(req.body);
    if(error) {
        let message = error.details.map((el) => el.message).join(",");
        throw new ExpressError(400 ,message)
    }else {
        next();
    }
}

module.exports = validateListing;
