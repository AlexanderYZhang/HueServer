# HueServer
### Inspiration
Having to either go through Alexa, Google home, or your phone sometimes can be a hassle when dealing with turning on and off your new Huge lightbulbs. What happened to traditional lightswitches? The idea is that using the aws programmable IOT button, you can customize actions and settings everytime you press the button. But this is still a hassle, this project allows you to set basic settings from a Messenger chatbot that will automatically update a database. Everytime you press a button, preferences are loaded in from the database and executed without any coding!

### Services Used
* Lex
* DynamoDB
* Lambda
* IOT

### Architecture
![Image](../master/Project_Architecture.png?raw=true)
### Setup
Set environment variables:
Host: Set to your Hue bridge host ip
User: Set to your the user registered on the bridge

Modify credentials.json to inlude your accesskey and secret access key
Install the dependencies
`npm install`
Run the server
`node server.js`
Configure Lex and IOT on the console

Zip LexScript folder and upload as lambda function to AWS
Link the lambda function to Alexa, setup sample utterances and slot types.
