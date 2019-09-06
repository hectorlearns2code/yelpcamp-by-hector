const 	Campground = require("../models/campground"),
		Comment = require("../models/comment"),
		User = require("../models/user");


// ALL MIDDLEWARE GOES HERE
var middlewareObj = {};

middlewareObj.checkUser = function(req,res,next) {
	if(req.isAuthenticated()) {
		User.findById(req.params.id, function(err,foundUserId) {
			if(err) {
				req.flash("error", "User not found");
				res.redirect("..");
			} else {
				if(foundUserId.equals(req.user.id) || req.user.isAdmin) {
					next();
				} else {
					req.flash("error", "You do not have permission to do that.");
					res.redirect("/campgrounds");
				}
			}
		})
	} else {
		req.flash("error", "You need to be logged in to do that.");
		// if not, redirect somewhere
		res.redirect("..");
	}
};

middlewareObj.checkCampgroundOwnership = function(req, res, next) {
	if(req.isAuthenticated()) {
		Campground.findById(req.params.id, function(err, foundCampground) {
			if(err) {
				req.flash("error", "Campground not found");
				res.redirect("/login");
			} else {
				// does user own the campground?
				if(foundCampground.author.id.equals(req.user._id) || req.user.isAdmin) {
					next();
				} else {
					req.flash("error", "You do not have permission to do that.");
					res.redirect("..");
				}
			}
		});
		// else redirect
	} else {
		req.flash("error", "You need to be logged in to do that.");
		// if not, redirect somewhere
		res.redirect("/login");
	}
};

middlewareObj.checkCommentOwnership = function(req, res, next) {
	if(req.isAuthenticated()) {
		Comment.findById(req.params.comment_id, function(err, foundComment) {
			if(err) {
				res.redirect("/login");
			} else {
				// does user own the comment?
				if(foundComment.author.id.equals(req.user._id) || req.user.isAdmin) {
					next();
				} else {
					req.flash("error", "You do not have permission to do that.");
					res.redirect("/campgrounds");
				}
			}
		});
		// else redirect
	} else {
		req.flash("error", "You need to be logged in to do that");
		// if not, redirect somewhere
		res.redirect("back");
	}
};

middlewareObj.isLoggedIn = function(req, res, next) {
	if(req.isAuthenticated()) {
		return next();
	}
	req.flash("error", "You need to be logged in to do that");
	res.redirect("/login");
};


module.exports = middlewareObj;