require('dotenv').config();

const express 		= require("express"),
	app 			= express(),
	bodyParser 		= require("body-parser"),
	mongoose 		= require("mongoose"),
	flash			= require("connect-flash"),
	passport		= require("passport"),
	LocalStrategy	= require("passport-local"),
	Campground 		= require("./models/campground"),
	Comment			= require("./models/comment"),
	User			= require("./models/user"),
	seedDB			= require("./seeds"),
	methodOverride	= require("method-override"),
	moment			= require("moment");

// DEPRCATION WARNING FIXES
mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);

// REQUIRING ROUTES
const commentRoutes 	= require("./routes/comments"),
	  campgroundRoutes 	= require("./routes/campgrounds"),
	  indexRoutes 		= require("./routes/index");


// =====================
// CONNECT DATABASE
// =====================
// mongoose.connect(process.env.DATABASEURL, {useNewUrlParser: true});

mongoose.connect(process.env.DATABASEURL,
	{
		useNewUrlParser: true,
		useCreateIndex: true
	}).then(() => {
		console.log("Connected to DB")
	}).catch(err => {
			console.log("ERROR:", err.message);
	});

// EXPRESS CONFIG
app.use(bodyParser.urlencoded({extended:true}));
app.set("view engine", "ejs");
app.use(express.static(__dirname + '/public'));
app.use(methodOverride("_method"));
app.use(flash());
app.locals.moment = require("moment");

// SEED THE DATABASE
// seedDB();

// PASSPORT CONFIG
app.use(require("express-session")({
	secret: "SUSHI SUSHI MEOW",
	resave: false,
	saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req, res, next) {
	res.locals.currentUser = req.user;
	res.locals.error = req.flash("error");
	res.locals.success = req.flash("success");
	next();
});


// ROUTES
app.use("/", indexRoutes);
app.use("/campgrounds", campgroundRoutes);
app.use("/campgrounds/:id/comments", commentRoutes);

const port = process.env.PORT || 3000;
app.listen(port, function () {
  console.log("Server Has Started!");
});