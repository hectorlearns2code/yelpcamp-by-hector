var mongoose = require("mongoose");

var commentSchema = mongoose.Schema({
	text: String,
	createDate: {
		type: Date,
		default: Date.now
	},
	author: {
		id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User"
		}
	}
});

module.exports = mongoose.model("Comment", commentSchema);