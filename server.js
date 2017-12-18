var hue = require("node-hue-api");
var async = require("async");
var bodyParser = require("body-parser");
var HueApi = hue.HueApi;
var lightState = hue.lightState;
var express = require("express");
var app = express();
// var dynamo = require("dynamodb")
var Joi = require("joi");
var port = 4000;
var AWS = require('aws-sdk');

AWS.config.loadFromPath('credentials.json');
AWS.config.update({region: "us-east-1"});

var host = process.env.HOST;
var user = process.env.USER;

ddb = new AWS.DynamoDB();


console.log("This is the host ip: " + host);
console.log("This is the user: " + user);

var displayResult = function(result) {
    console.log(JSON.stringify(result, null, 2));
};

var displayError = function(err) {
    console.error(err);
};

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

var api = new HueApi(host, user);

// api.lights(function(err, config) {
//     if (err) throw err;
//     displayResult(config);
// });

var state = lightState.create();

const action = (req, res) => {
	console.log("NEW REQUEST");
	var params = {
		TableName: 'ButtonsTable',
		Key: {
			"id" : {S: "G030MD049054QVJN"},
		},
	};
	async.waterfall([
		function(cb) {
			ddb.getItem(params, function(err, data) {
				if (err) {
					console.log("Error", err);
					cb(err);
				} else {
					cb(err, data["Item"]);
				}
			});
		},
		function(data, cb) {
			console.log("this is the data", data);
			var event = req.body["clickType"].toLowerCase()
			var targets = data["event"]["M"][event];
			async.each(targets["SS"], function(id, cb2) {
				var params = {
				  TableName: 'DevicesTable',
				  Key: {
				    "number" : {S: id},
				  },
				  ExpressionAttributeNames: {
				  	"#s": "state",
				  	"#n": "number",
				  },
				  ProjectionExpression: "#s, #n",
				};
				async.waterfall([
					function(cb3) {
						console.log("This is the id", id);
						ddb.getItem(params, cb3);
					},
					function(data, cb3) {
						var number = parseInt(data["Item"]["number"]["S"]);
						api.lightStatus(number, function(err, result) {
							if (err) {
								return err;
							}
							var on = result["state"]["on"];
							cb3(null, data, on);
							return;
						})
					},
					function(data, on, cb3) {
						var number = parseInt(data["Item"]["number"]["S"]);
						if (!on) {
							api.setLightState(number, {on: true}, function(err, result) {
								cb3(err, data, on);
								return;
							});
						} else {
							api.setLightState(number, {on: false}, function(err, result) {
								cb3(err, data, on);
								return;
							});
						}
						cb3(err, data, on);
					},
					function(data, on, cb3) {
						console.log("is light on", on);
						var number = parseInt(data["Item"]["number"]["S"]);
						data = data["Item"]["state"]["M"];
						var state = {};
						if (!on) {
							state = {
								bri: data["bri"]["N"],
								hue: data["hue"]["N"],
								sat: data["sat"]["N"],
								effect: data["effect"]["S"],
								ct: data["ct"]["N"],
								colormode: data["colormode"]["S"],
							}
						} else {
							cb3(null);
							return;
						}
						console.log(state);
						console.log("this is the target number", number);
						api.setLightState(number, state)
							    .then()
							    .fail(displayError)
							    .done();
						cb3(null);
					},
				], function(err, result) {
					if (err) {
						console.log(err);
						return err;
					}
					cb2(null);
				});
			}, function(err) {
				if (err) {
					console.log(err);
					return err;
				}
				cb();
			})
		},
	], function(err, result) {
		if (err) {
			console.log(err);
		}
		res.send('POST request received')
		console.log("Done with one iteration");
	});
};

app.get('/', (request, response) => {
	console.log("Received a get request");
})
;
app.post('/', (request, response) => {
	console.log("Received a post request");
});

app.post('/single', action);

app.post('/double', action);

app.post('/long', action);

console.log("Listening on port " + port);
app.listen(port);


