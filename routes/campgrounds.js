const express 		= require("express"),
	  router 		= express.Router(),
	  Campground	= require("../models/campground"),
	  middleware	= require("../middleware"),
	  NodeGeocoder 	= require('node-geocoder'),
	  multer		= require("multer"),
	  cloudinary	= require("cloudinary");

// Image Upload
var storage = multer.diskStorage({
	filename: function(req, file, callback) {
	  callback(null, Date.now() + file.originalname);
	}
  });
  var imageFilter = function (req, file, cb) {
	  // accept image files only
	  if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
		  return cb(new Error('Please upload a valid image file'), false);
	  }
	  cb(null, true);
  };
  var upload = multer({ storage: storage, fileFilter: imageFilter})

cloudinary.config({ 
cloud_name: 'dzg9hlncf', 
api_key: process.env.CLOUDINARY_API_KEY, 
api_secret: process.env.CLOUDINARY_API_SECRET
});

// GoogleMaps
var options = {
provider: 'google',
httpAdapter: 'https',
apiKey: process.env.GEOCODER_API_KEY,
formatter: null
};

var geocoder = NodeGeocoder(options);

// INDEX ROUTE - show all campgrounds
router.get("/", function(req,res) {
	// Fuzzy Search
	if(req.query.search) {
		const regex = new RegExp(escapeRegex(req.query.search), 'gi');
		Campground.find({name: regex}, function(err, allCampgrounds) {
			if(err) {
				console.log(err); 
			} else {
				if(allCampgrounds.length < 1) {
					return res.render("campgrounds/results",{campgrounds: allCampgrounds});
				}
				res.render("campgrounds/results", {campgrounds: allCampgrounds, page: "campgrounds"});
			}
		});
	} else {
		// Get campgrounds from DB
		Campground.find({}, function(err, allCampgrounds) {
			if(err) {
				console.log(err); 
			} else {
				res.render("campgrounds/index", {campgrounds: allCampgrounds, page: "campgrounds"});
			}
		});
	}
});

// NEW ROUTE - show form to create new campground
router.get("/new", middleware.isLoggedIn, function(req,res) {
	res.render("campgrounds/new");
});

//CREATE - add new campground to DB - GEOCODER MUST BE INSIDE CLOUDINARY FUNCTION
router.post("/", middleware.isLoggedIn, upload.single('image'), function(req, res) {
	// get data from form and add to campgrounds array
	cloudinary.v2.uploader.upload(req.file.path, {folder: "YelpCamp/Campgrounds"}, function(err,result) {
		// add cloudinary url for the image to the campground object under image property
		req.body.campground.image = result.secure_url;
		// add author to campground
		req.body.campground.author = {
		  id: req.user._id,
		}
		geocoder.geocode(req.body.location, function (err, data) {
			if (err || !data.length) {
			  console.log(err);
			  req.flash('error', 'Invalid address');
			  return res.redirect('back');
			}
			req.body.campground.lat = data[0].latitude;
			req.body.campground.lng = data[0].longitude;
			req.body.campground.location = data[0].formattedAddress;
		});
		// Create a new campground and save to DB
		Campground.create(req.body.campground, function(err, campground) {
		  if (err) {
			req.flash('error', err.message);
			return res.redirect('back');
		  }
		  res.redirect('/campgrounds/' + campground.id);
		});
	  });
  });


// SHOW ROUTE - shows more info about one campground
router.get("/:id", function(req,res) {
	// DEEP POPULATE AND MULTIPLE POPULATE on comments and author
	Campground.findById(req.params.id)
	.populate("author.id")
	.populate({
		path : "comments", populate: {path: "author.id"}
	})
	.exec(function (err, foundCampground) {
		if(err) {
			console.log(err);
		} else {
			// render show template with that campground
			res.render("campgrounds/show", {campground: foundCampground});
		}
	});
});

// EDIT CAMPGROUND ROUTE
router.get("/:id/edit",  function(req,res) {
	Campground.findById(req.params.id, function(err, foundCampground) {
		res.render("campgrounds/edit", {campground: foundCampground});
	});
});

// UPDATE CAMPGROUND ROUTE - GEOCODER MUST BE INSIDE CLOUDINARY FUNCTION
router.put("/:id", middleware.checkCampgroundOwnership, upload.single('image'), function(req, res){
	if(req.file) {
		cloudinary.v2.uploader.upload(req.file.path, {folder: "YelpCamp/Campgrounds"}, function(err,result) {
			// add cloudinary url for the image to the campground object under image property
			req.body.campground.image = result.secure_url;
			geocoder.geocode(req.body.location, function (err, data) {
				if (err || !data.length) {
				  req.flash('error', 'Invalid address');
				  return res.redirect('back');
				}
				req.body.campground.lat = data[0].latitude;
				req.body.campground.lng = data[0].longitude;
				req.body.campground.location = data[0].formattedAddress;
			
				Campground.findByIdAndUpdate(req.params.id, req.body.campground, function(err, campground){
					if(err){
						req.flash("error", err.message);
						res.redirect("..");
					} else {
						req.flash("success","Successfully Updated!");
						res.redirect("/campgrounds/" + campground._id);
					}
				});
			  });
		});
	} else {
		geocoder.geocode(req.body.location, function (err, data) {
			if (err || !data.length) {
			  req.flash('error', 'Invalid address');
			  return res.redirect('back');
			}
			req.body.campground.lat = data[0].latitude;
			req.body.campground.lng = data[0].longitude;
			req.body.campground.location = data[0].formattedAddress;
		
			Campground.findByIdAndUpdate(req.params.id, req.body.campground, function(err, campground){
				if(err){
					req.flash("error", err.message);
					res.redirect("..");
				} else {
					req.flash("success","Successfully Updated!");
					res.redirect("/campgrounds/" + campground._id);
				}
			});
		  });
	}
  });

// DESTROY CAMPGROUND ROUTE
router.delete("/:id", middleware.checkCampgroundOwnership, function(req,res) {
	Campground.findByIdAndRemove(req.params.id, function(err) {
		if(err) {
			res.redirect("/campgrounds");
		} else {
			req.flash("success", "Campground has been deleted");
			res.redirect("/campgrounds");
		}
	});
});

function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

module.exports = router;