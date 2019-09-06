const	express 	= require("express"),
		router 		= express.Router({mergeParams: true}),
	  	Campground 	= require("../models/campground"),
	  	Comment		= require("../models/comment"),
	  	middleware	= require("../middleware");


// COMMENTS NEW
// router.get("/new", middleware.isLoggedIn, function(req,res) {
// // Find campground by id
// 	Campground.findById(req.params.id, function(err, campground) {
// 		if(err) {
// 			console.log(err);
// 		} else {
// 			res.render("comments/new", {campground: campground});
// 		}
// 	});
// });

// COMMENTS CREATE
router.post("/", middleware.isLoggedIn, function(req,res) {
	Campground.findById(req.params.id, function(err, campground) {
		if(err) {
			req.flash("error", "Something went wrong.");
			console.log(err);
		} else {
			Comment.create(req.body.comment, function(err, comment) {
				if(err) {
					console.log(err);
				} else {
					// add username and id to comment
					comment.author.id = req.user._id;
					comment.author.username = req.user.username;
					comment.author.avatar = req.user.avatar;
					// save comment
					comment.save();
					campground.comments.push(comment);
					campground.save();
					console.log(comment);
					req.flash("success", "Successfully added comment.");
					res.redirect(req.get("referer"));
				}
			});
		}
	});
});

// EDIT COMMENTS ROUTE
router.get("/:comment_id/edit", middleware.checkCommentOwnership, function(req,res) {
	Comment.findById(req.params.comment_id, function(err, foundComment) {
		if(err) {
			res.redirect("back");
		} else {
			res.render("comments/edit", {campground_id: req.params.id, comment: foundComment});
		}
	});
});

// UPDATE COMMENT ROUTE
router.put("/:comment_id", middleware.checkCommentOwnership, function(req,res) {
	Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, function(err,updatedComment) {
		if(err) {
			res.redirect("back");
		} else {
			res.redirect("/campgrounds/" + req.params.id);
		}
	});
});

// DELETE COMMENT ROUTE
router.delete("/:comment_id", middleware.checkCommentOwnership, function(req,res) {
	Comment.findByIdAndRemove(req.params.comment_id, function(err, foundComment) {
		if(err) {
			res.redirect("back");
		} else {
			req.flash("success", "Comment deleted.");
			res.redirect("/campgrounds/" + req.params.id);
		}
	});
});


module.exports = router;