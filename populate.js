var hue = require("node-hue-api");
var dynamo = require("dynamodb")
var Joi = require("joi");
var HueApi = hue.HueApi;
// var AWS = require('aws-sdk');
var _ = require('lodash');

var host = process.env.HOST;
var user = process.env.USER;
dynamo.AWS.config.loadFromPath('credentials.json');
dynamo.AWS.config.update({region: "us-east-1"});
console.log("This is the host ip: " + host);
console.log("This is the user: " + user);

var displayResult = function(result) {
    console.log(JSON.stringify(result, null, 2));
};

var displayError = function(err) {
    console.error(err);
};

var api = new HueApi(host, user);

var Device = new dynamo.define("Device", {
	hashKey: "number",
	timestamps: true,
	schema: {
		name: Joi.string(),
		id: Joi.string(),
		number: Joi.string(),
		state: {
			bri: Joi.number(),
			hue: Joi.number(),
			sat: Joi.number(),
			effect: Joi.string(),
			ct: Joi.number(),
			colormode: Joi.string(),
		}
	}
});

var Button = new dynamo.define("Button", {
	hashKey: "id",
	schema: {
		id: Joi.string(),
		event: {
			single: dynamo.types.stringSet(),
			double: dynamo.types.stringSet(),
			long: dynamo.types.stringSet(),
		},
	}
})

Device.config({tableName: "DevicesTable"});
Button.config({tableName: "ButtonsTable"});

dynamo.createTables(function(err) {
	if (err) {
		console.log('Error creating tables: ', err);
	} else {
		console.log('Tables has been created');
	}
});

// gotta populate the events with something
Button.create({
	id: "G030MD049054QVJN",
	event: {
		single: ["1"],
		double: ["2"],
		long: ["3"],
	},
}, function(err, acc) {
	console.log("insert");
	if (err) {
		console.log(err);
	}
	console.log("Created button in dynamo");
});

// maybe use uniqe id instead
api.lights(function(err, config) {
	if (err) throw err;
	var lights = config.lights;;
	_.forEach(lights, function(value) {
		console.log(value);
		var state = value["state"];
		console.log(state);
		Device.create({
			name: value["name"],
			id: value["uniqueid"],
			number: value["id"],
			state: {
				bri: state["bri"],
				hue: state["hue"],
				sat: state["sat"],
				effect: state["effect"],
				ct: state["ct"],
				colormode: state["colormode"],
			}
		}, function(err, acc) {
			console.log("HI");
			if (err) {
				console.log(err);
			}
			console.log("Created item in dynamo");
		});
	});
});
