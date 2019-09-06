const express 		= require("express"),
	  router 		= express.Router(),
	  passport		= require("passport"),
	  User			= require("../models/user"),
	  middleware	= require("../middleware"),
	  Campground 	= require("../models/campground"),
	  async			= require("async"),
	  nodemailer	= require("nodemailer"),
	  multer		= require("multer"),
	  cloudinary	= require("cloudinary");

var crypto = require("crypto");

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

// ROOT
router.get("/", function(req,res) {
	res.render("landing");
});

// SHOW LOGIN FORM
router.get("/login", function(req,res) {
	res.render("login", {page: "login"});
});

// HANDLE LOGIN LOGIC
router.post("/login", passport.authenticate("local",
		{
			successRedirect: "/campgrounds",
			failureRedirect: "/login"
		}), function(req,res) {
});

// LOGOUT
router.get("/logout", function(req,res) {
	req.logout();
	req.flash("success", "You have logged out.");
	res.redirect("/campgrounds");
});

// NEW USER
router.get("/register", function(req,res) {
	res.render("register", {page: "register"});
});

// CREATE USER
router.post("/register", upload.single('image'), function(req,res) {
	cloudinary.v2.uploader.upload(req.file.path, {folder: "YelpCamp/Avatars"}, function(err,result) {
		// add cloudinary url for the image to the user object under image property
		req.body.user.avatar = result.secure_url;
		req.body.user.username = req.body.username;
		if(req.body.user.adminCode === process.env.ADMINCODE) {
			req.body.user.isAdmin = true;
		}
		User.register(req.body.user, req.body.password, function (err, user) {
			if(err) {
				console.log("err");
				return res.render("register", {"error": err.message});
			}
			passport.authenticate("local")(req, res, function() {
				req.flash("success", "Successfully signed up! Welcome to YelpCamp, " + user.username);
				res.redirect("/campgrounds");
			});
		});
	});
});

// ==============================
// USER PROFILE
// ==============================

// SHOW EDIT USER FORM
router.get("/users/:id/edit", middleware.checkUser , function(req,res) {
	User.findById(req.params.id, function(err, foundUser) {
		if(err) {
			console.log(err);
		} else {
			res.render("users/edit", {user: foundUser});
		}
	})
});

// UPDATE USER
router.put("/users/:id", middleware.checkUser, upload.single('image'), function(req,res) {
	if(req.file) {
		cloudinary.v2.uploader.upload(req.file.path, {folder: "YelpCamp/Avatars"}, function(err,result) {
			// add cloudinary url for the image to the user object under image property
			req.body.user.avatar = result.secure_url;
			User.findByIdAndUpdate(req.params.id, req.body.user, function(err, user) {
				if(err){
					req.flash("error", err.message);
					res.redirect("..");
				} else {
					req.flash("success","Successfully Updated!");
					res.redirect("/users/" + user._id);
				}
			})
		});
	} else {
		User.findByIdAndUpdate(req.params.id, req.body.user, function(err, user) {
			if(err){
				req.flash("error", err.message);
				res.redirect("..");
			} else {
				req.flash("success","Successfully Updated!");
				res.redirect("/users/" + user._id);
			}
		})
	}

});

// SHOW USER
router.get("/users/:id", function(req,res) {
	User.findById(req.params.id, function(err, foundUser) {
		if(foundUser) {
			if(err) {
				req.flash("error", "Something went wrong.");
				res.redirect("..")
			}
			Campground.find().where('author.id').equals(foundUser._id).exec(function(err,campgrounds) {
				if(err) {
					req.flash("error", "Something went wrong.");
					res.redirect("..")
				}
				res.render("users/show", {user:foundUser, campgrounds: campgrounds});
			})
		} else {
			req.flash("error", "Sorry, user no longer exists.");
			res.redirect("/campgrounds")
		}
	});
});

// ====================
// PASSWORD RESET
// ====================

// SHOW FORGOT PASSWORD EMAIL REQUEST FORM
router.get('/forgot', function(req, res) {
	res.render('users/forgot');
  });
  
  router.post('/forgot', function(req, res, next) {
	async.waterfall([
	  function(done) {
		crypto.randomBytes(20, function(err, buf) {
		  var token = buf.toString('hex');
		  done(err, token);
		});
	  },
	  function(token, done) {
		User.findOne({ email: req.body.email }, function(err, user) {
		  if (!user) {
			req.flash('error', 'No account with that email address exists.');
			return res.redirect('/forgot');
		  }
  
		  user.resetPasswordToken = token;
		  user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
  
		  user.save(function(err) {
			done(err, token, user);
		  });
		});
	  },
	  function(token, user, done) {
		var smtpTransport = nodemailer.createTransport({
		  service: 'Gmail', 
		  auth: {
			user: 'hectorlearns2code@gmail.com',
			pass: process.env.GMAILPW
		  }
		});
		var mailOptions = {
		  to: user.email,
		  from: 'hectorlearns2code@gmail.com',
		  subject: 'Node.js Password Reset',
		  text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
			'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
			'http://' + req.headers.host + '/reset/' + token + '\n\n' +
			'If you did not request this, please ignore this email and your password will remain unchanged.\n'
		};
		smtpTransport.sendMail(mailOptions, function(err) {
		  console.log('mail sent');
		  req.flash('success', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
		  done(err, 'done');
		});
	  }
	], function(err) {
	  if (err) return next(err);
	  res.redirect('/forgot');
	});
  });
  
// SHOW PASSWORD RESET FORM
  router.get('/reset/:token', function(req, res) {
	User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
	  if (!user) {
		req.flash('error', 'Password reset token is invalid or has expired.');
		return res.redirect('/forgot');
	  }
	  res.render('users/reset', {token: req.params.token});
	});
  });

// HANDLE PASSWORD RESET LOGIC
  router.post('/reset/:token', function(req, res) {
	async.waterfall([
	  function(done) {
		User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
		  if (!user) {
			req.flash('error', 'Password reset token is invalid or has expired.');
			return res.redirect('back');
		  }
		  if(req.body.password === req.body.confirm) {
			user.setPassword(req.body.password, function(err) {
			  user.resetPasswordToken = undefined;
			  user.resetPasswordExpires = undefined;
  
			  user.save(function(err) {
				req.logIn(user, function(err) {
				  done(err, user);
				});
			  });
			})
		  } else {
			  req.flash("error", "Passwords do not match.");
			  return res.redirect('back');
		  }
		});
	  },
	  function(user, done) {
		var smtpTransport = nodemailer.createTransport({
		  service: 'Gmail', 
		  auth: {
			user: 'hectorlearns2code@gmail.com',
			pass: process.env.GMAILPW
		  }
		});
		var mailOptions = {
		  to: user.email,
		  from: 'hectorlearns2code@gmail.com',
		  subject: 'Your password has been changed',
		  text: 'Hello,\n\n' +
			'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
		};
		smtpTransport.sendMail(mailOptions, function(err) {
		  req.flash('success', 'Success! Your password has been changed.');
		  done(err);
		});
	  }
	], function(err) {
	  res.redirect('/campgrounds');
	});
  });
  
// USER PROFILE
  router.get("/users/:id", function(req, res) {
	User.findById(req.params.id, function(err, foundUser) {
	  if(err) {
		req.flash("error", "Something went wrong.");
		res.redirect("/");
	  }
	  Campground.find().where('author.id').equals(foundUser._id).exec(function(err, campgrounds) {
		if(err) {
		  req.flash("error", "Something went wrong.");
		  res.redirect("/");
		}
		res.render("users/show", {user: foundUser, campgrounds: campgrounds});
	  })
	});
  });

module.exports = router;