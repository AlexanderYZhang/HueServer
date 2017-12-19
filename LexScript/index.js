var AWS = require('aws-sdk');
var async = require("node_modules/async");
var ddb = new AWS.DynamoDB();

function getAll(sessionAttributes, fulfillmentState, target, callback) {
	var tableName;
	if (target == "devices") {
		tableName = "DevicesTable";
	} else {
		// should do error handling here at some point
		tableName = "ButtonsTable";
	}
	console.log("This is the table name", tableName);
	var params = {
		TableName: tableName,
	}
	async.waterfall([
		function(cb) {
			ddb.scan(params, cb);
		},
		function(data, cb) {
			// error checking if data is null
			var content = "";
			if (data["Count"] === 0) {
				content = "No Devices";
			} else {
				var targets = data["Items"];
				targets.forEach(function(item) {
					if (tableName === "ButtonsTable") {
						content += "id: " + item["id"]["S"] + "\n";
						var single = JSON.stringify(item["event"]["M"]["single"]["SS"]);
						var double = JSON.stringify(item["event"]["M"]["double"]["SS"]);
						var long = JSON.stringify(item["event"]["M"]["long"]["SS"]);
						content += "Single: " + single + "\n"
						content += "Double: " + double + "\n"
						content += "Long: " + long + "\n";
					} else {
						content += "id: " + item["number"]["S"] + "\n";
						content += "name: " + item["name"]["S"] + "\n";
						content += "\n";
					}
				});	
			}
			var message = {
				contentType: "PlainText",
				content: content,
			};
			console.log(content);
			var response = {
				sessionAttributes,
				dialogAction: {
					type: "Close",
					fulfillmentState,
					message,
				}
			}
			cb(null, response);
		}
	], function(err, result) {
		if (err) {
			console.log(err);
		}
		callback(result);
	});
}

function set(sessionAttributes, fulfillmentState, data, callback) {
	// error checkin for table name
	var tableName = "DevicesTable";
	var property = "value";
	var updateExpressions = {
		"bri": "set #s.bri=:v1",
		"hue": "set #s.hue=:v1",
		"sat": "set #s.sat=:v1",
		"effect": "set #s.effect=:v1",
		"ct": "set #s.ct=:v1",
		"colormode": "set #s.colormode=:v1",
	}
	var expressionAttributes = {
		":v1": {"N": data.value ? data.value : 0}
	};
	if (data.effect) {
		property = data.effect;
		expressionAttributes = {
			":v1": {"S": data.effect},
		};
	}
	if (data.colormode) {
		property = data.effect;
		expressionAttributes = {
			":v1": {"S": data.colormode},
		};
	}
	var params = {
		TableName: tableName,
		Key: {
			"number": {S: data.device}
		},
    	UpdateExpression: updateExpressions[data.property],
    	ExpressionAttributeNames: {
    		"#s": "state",
    	},
    	ExpressionAttributeValues: expressionAttributes
	};
	async.waterfall([
		function(cb) {
			ddb.updateItem(params, cb);
		}, 
	], function(err, result) {
		if (err) {
			console.log(err);
		}
		var content = "Updated " + data.property + " to: " + data.value;
		var message = {
			contentType: "PlainText",
			content: content,
		};
		console.log(content);
		var response = {
			sessionAttributes,
			dialogAction: {
				type: "Close",
				fulfillmentState,
				message,
			}
		}
		callback(response);
	});
}

function Unlink(sessionAttributes, fulfillmentState, data, callback) {
	// input validation
	var tableName = "ButtonsTable";
	var params = {
		TableName: tableName,
		Key: {
			"id": {"S": data.button}
		},
	};
	async.waterfall([
		function(cb) {
			ddb.getItem(params, cb);
		},
		function(res, cb) {
			var event = data.event.toLowerCase();
			var targets = res["Item"]["event"]["M"][event]["SS"];
			if (targets.indexOf(data.device) === -1) {
				cb("Not linked");
			} else {
				cb(null, res);
			}
		},
		function(res, cb) {
			var event = data.event.toLowerCase();
			var updateExpression = "delete event.#n :a";
			params = {
				TableName: tableName,
				Key: {
					"id": {"S": data.button},
				},
				UpdateExpression: updateExpression,
				ExpressionAttributeValues: {
					":a": {
						"SS": [data.device]
					}
				},
				ExpressionAttributeNames: {
					"#n": event,
				}
			}
			ddb.updateItem(params, cb);
		}
	], function(err, result) {
		var content = "";
		if (err) {
			content = err;
		} else {
			content = "Unlinked " + data.button + " " + data.event + " with " + data.device;
		}
		var message = {
			contentType: "PlainText",
			content,
		};
		var response = {
			sessionAttributes,
			dialogAction: {
				type: "Close",
				fulfillmentState,
				message,
			}
		}
		callback(response);
	});
}

function Link(sessionAttributes, fulfillmentState, data, callback) {
	// input validation
	var tableName = "ButtonsTable";
	var params = {
		TableName: tableName,
		Key: {
			"id": {"S": data.button}
		},
	};
	async.waterfall([
		function(cb) {
			ddb.getItem(params, cb);
		},
		function(res, cb) {
			var event = data.event.toLowerCase();
			var targets = res["Item"]["event"]["M"][event]["SS"];
			if (targets.indexOf(data.device) === -1) {
				cb(null, res);
			} else {
				cb("Already linked");
			}
		},
		function(res, cb) {
			var event = data.event.toLowerCase();
			var updateExpression = "add event.#n :a";
			params = {
				TableName: tableName,
				Key: {
					"id": {"S": data.button},
				},
				UpdateExpression: updateExpression,
				ExpressionAttributeValues: {
					":a": {
						"SS": [data.device]
					}
				},
				ExpressionAttributeNames: {
					"#n": event,
				}
			}
			ddb.updateItem(params, cb);
		}
	], function(err, result) {
		var content = "";
		if (err) {
			content = err;
		} else {
			content = "Linked " + data.button + " " + data.event + " with " + data.device;
		}
		var message = {
			contentType: "PlainText",
			content,
		};
		var response = {
			sessionAttributes,
			dialogAction: {
				type: "Close",
				fulfillmentState,
				message,
			}
		}
		callback(response);
	});
}

function getDevice(sessionAttributes, fulfillmentState, group, target, callback) {
	var tableName;
	if (group == "devices") {
		tableName = "DevicesTable";
	} else {
		// should do error handling here at some point
		tableName = "ButtonsTable";
	}
	var params = {
		TableName: tableName,
    	KeyConditionExpression: "#n=:v1",
    	ExpressionAttributeNames: {
    		"#n": "number",
    	},
    	ExpressionAttributeValues: {
        	":v1": {"S": target},
    	},
	};
	async.waterfall([
		function(cb) {
			ddb.query(params, cb);
		},
		function(data, cb) {
			// error checking if data is null
			var content = "";
			if (data["Count"] === 0) {
				content = "That was an invalid device number";	
			} else {
				var state = data["Items"][0]["state"]["M"];
				content += "name: " + data["Items"][0]["name"]["S"] + "\n";
				content += "brightness: " + state["bri"]["N"] + "\n";
				content += "hue: " + state["hue"]["N"] + "\n";
				content += "saturation: " + state["sat"]["N"] + "\n";
				content += "effect: " + state["effect"]["S"] + "\n";
				content += "color type: " + state["ct"]["N"] + "\n";
				content += "colormode: " + state["colormode"]["S"] + "\n";
			}

			var message = {
				contentType: "PlainText",
				content,
			};

			var response = {
				sessionAttributes,
				dialogAction: {
					type: "Close",
					fulfillmentState,
					message,
				}
			}
			cb(null, response);
		}
	], function(err, result) {
		if (err) {
			console.log(err);
		}
		callback(result);
	});
}


// --------------- Events -----------------------
 
function dispatch(intentRequest, callback) {
    const sessionAttributes = intentRequest.sessionAttributes;
    const slots = intentRequest.currentIntent.slots;
    const inputTranscript = intentRequest.inputTranscript;
    const intent = intentRequest.currentIntent.name;
    if (intent === "ShowAll") {
   		const devices = slots.devices;
    	const device = slots.device;
	    if (!device) {
	    	getAll(sessionAttributes, "Fulfilled", devices, callback);
	    } else {
	    	// probably should error handle here too
	    	getDevice(sessionAttributes, "Fulfilled", devices, device, callback);
	    } 
    } else if (intent === "SetDevice") {
    	var settings = {
	    	property: slots.property,
	    	device: slots.device,
	    	value: slots.value,
	    	effect: slots.effect,
	    	colormode: slots.colormode,
    	}
    	set(sessionAttributes, "Fulfilled", settings, callback);
    } else if (intent === "Link") {
    	var settings = {
    		button: slots.button,
    		device: slots.device.toString(),
    		event: slots.event,
    	}
    	Link(sessionAttributes, "Fulfilled", settings, callback);
    } else if (intent === "Unlink") {
    	var settings = {
    		button: slots.button,
    		device: slots.device.toString(),
    		event: slots.event,
    	}
    	Unlink(sessionAttributes, "Fulfilled", settings, callback);
    }
}

// --------------- Main handler -----------------------
 
// Route the incoming request based on intent.
// The JSON body of the request is provided in the event slot.
exports.handler = (event, context, callback) => {
    try {
        dispatch(event,
            (response) => {
                callback(null, response);
            });
    } catch (err) {
        callback(err);
    }
};