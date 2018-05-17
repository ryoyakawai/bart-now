'use strict';

const SKILLID = 'amzn1.ask.skill.02aafc22-ff0a-47f6-b7e6-acf978bd0f42';
const BartConnector = require('./scripts/bartconnector.js');
const bc = new BartConnector();

function buildSpeechletResponseSSML(title, output_ssml, repromptText_ssml, shouldEndSession) {
    let output_plain = output_ssml.replace(/<[^>]*>/g, '');
    let out = {
        outputSpeech: {
            type: 'SSML',
            ssml: '<speak>'
                + output_ssml
                + '</speak>'
        },
        card: {
            type: 'Simple',
            title: `SessionSpeechlet - ${title}`,
            content: `SessionSpeechlet - ${output_plain}`
        },
        reprompt: {
            outputSpeech: {
                type: 'SSML',
                ssml: '<speak> '
                    + repromptText_ssml
                    + '</speak>'
            }
        },
        shouldEndSession
    };
    return out;
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: '1.0',
        sessionAttributes,
        response: speechletResponse
    };
}

// --------------- Functions that control the skill's behavior -----------------------

function getWelcomeResponse(session, callback) {
    let sessionAttributes = session.attributes;
    sessionAttributes = {
        station: {
            departure: null,
            destination: null,
            direction: null
        }
    };
    const cardTitle = 'Welcome';
    const speechOutput = "Hi. Wellcome to Catch Bart. Tell me departure station.";
    const repromptText = speechOutput;
    const shouldEndSession = false;
    
    callback(sessionAttributes,
             buildSpeechletResponseSSML(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function handleSessionEndRequest(callback) {
    const cardTitle = 'Session Ended';
    const speechOutput = 'No problem. Ask me anytime whenever you need. Have a great day!';
    // Setting this to true ends the session and exits the skill.
    const shouldEndSession = true;

    callback({}, buildSpeechletResponseSSML(cardTitle, speechOutput, null, shouldEndSession));
}

function handleUndefinedRequest(callback) {
    const sessionAttributes = {};
    const cardTitle = 'undefined';
    const speechOutput = "I couldn't understand what you have just said. <break time ='1s' /> Tell me the date of the schedule you would like to know again, please.";
    const repromptText = speechOutput;
    const shouldEndSession = false;

    callback(sessionAttributes,
             buildSpeechletResponseSSML(cardTitle, speechOutput, repromptText, shouldEndSession));    
}

/**
 * Sets the departure station in the session and prepares the speech to reply to the user.
 */
function setDepartureStationInSession(intent, session, callback) {
    const cardTitle = intent.name;
    const bartStationSlot = intent.slots.BART_STATION;
    let repromptText = '';
    let sessionAttrStation = session.attributes.station;
    const shouldEndSession = false;
    let speechOutput = '';

    // check match
    let resolution = bartStationSlot.resolutions.resolutionsPerAuthority;
    let match = false;
    for(let i in resolution) {
        if(resolution[i].status.code == 'ER_SUCCESS_MATCH') {
            let selectedStation = resolution[i].values[0].value.name;
            let onlyDirect = bc.hasOnlyDirection(selectedStation);
            if( onlyDirect.status == false ) {
                if(sessionAttrStation.departure === null) {
                    sessionAttrStation.departure = selectedStation;
                    speechOutput  = `OK. Set ${sessionAttrStation.departure} as departure station. Then, tell me a destination by station name or direction, such as south or north.`;
                    repromptText = "Set ${bartDepartureStation} as departure station. Then, tell me a destination by station name or direction, such as south or north.";
                } else {
                    if((new String(selectedStation.value)).toLowerCase().match(/south|north/) !== null) {
                        sessionAttrStation.direction = selectedStation.value;
                        speechOutput  = `Done. Going ${sessionAttrStation.direction}, departing from ${sessionAttrStation.departure}. Give me a second, please.`;
                        repromptText = `Going ${sessionAttrStation.direction}, departing from ${sessionAttrStation.departure}.`;
                    } else {
                        sessionAttrStation.destination = bartStationSlot.value;
                        speechOutput  = `Done. Departing from ${sessionAttrStation.departure} to ${sessionAttrStation.destination}. Give me a second, please.`;
                        repromptText = `Departing from ${sessionAttrStation.departure} to ${sessionAttrStation.destination}`;
                    }
                }
            } else {
                sessionAttrStation.departure = selectedStation;
                sessionAttrStation.direction = onlyDirect.onlyDirection;
                speechOutput = `OK. Set ${sessionAttrStation.departure} as departure station. And ${sessionAttrStation.direction} is the only available direction from ${sessionAttrStation.departure} station. So, let me start researching. Please give me a second.`;
                repromptText = `Set ${sessionAttrStation.departure} as departure station. And ${sessionAttrStation.direction} is the only available direction. So, let me start researching. Please give me a second.`;
            }
            match = true;
            break;
        }
    }

    if( match === false ) {
        let promptPoint = 'destination';
        let usersInput = bartStationSlot.value;
        if(sessionAttrStation.departure == null) {
            promptPoint = 'departure';
        }
        // [TODO] to be able to correct ambigious station name here
        speechOutput = `Sorry, ${usersInput} is not valid input. Would you please try to specify ${promptPoint} station name or direction again?`;
        repromptText = `Sorry, ${usersInput} is not valid input. Would you please try to specify ${promptPoint} station name or direction again?`;
    }
    
    let sessionAttributes = session.attributes;
    sessionAttributes.station = sessionAttrStation;

    callback(sessionAttributes,
             buildSpeechletResponseSSML(cardTitle, speechOutput, repromptText, shouldEndSession));
}

// --------------- Events -----------------------

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log(`onSessionStarted requestId=${sessionStartedRequest.requestId}, sessionId=${session.sessionId}`);
}
/**
 * Called when the user launches the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log(`onLaunch requestId=${launchRequest.requestId}, sessionId=${session.sessionId}`);

    // Dispatch to your skill's launch.
    getWelcomeResponse(session, callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
    console.log(`[onIntent] intentname=${intentRequest.intent.name}, requestId=${intentRequest.requestId}, sessionId=${session.sessionId}`);

    const intent = intentRequest.intent;
    const intentName = intentRequest.intent.name;

    // Dispatch to your skill's intent handlers
    switch(intentName) {
    case 'MyDepartureStation':
        console.log(`[onIntent:${intent.slots.BART_STATION.value}] user_input=${intent.slots.BART_STATION.value}`);
        setDepartureStationInSession(intent, session, callback);
        break;
    case 'AMAZON.StopIntent':
    case 'AMAZON.CancelIntent':
        console.log('Intent: ' + intentName );
        handleSessionEndRequest(callback);
        break;
    default:
        handleUndefinedRequest();
        break;
    }
}
/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log(`onSessionEnded requestId=${sessionEndedRequest.requestId}, sessionId=${session.sessionId}`);
    // Add cleanup logic here
}

// --------------- Main handler -----------------------

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = (event, context, callback) => {
    try {
        console.log(`event.session.application.applicationId=${event.session.application.applicationId}`);
        
        /**
         * Uncomment this if statement and populate with your skill's application ID to
         * prevent someone else from configuring a skill that sends requests to this function.
         */
        /*
          if (event.session.application.applicationId !== SKILLID) {
          callback('[Invalid Application ID] invalid: ' + event.session.application.applicationId + ', valid: ' + SKILLID);
          }
        */
        if (event.session.new) {
            onSessionStarted({ requestId: event.request.requestId }, event.session);
        }

        switch(event.request.type) {
        case 'LaunchRequest':
            onLaunch(event.request,
                     event.session,
                     (sessionAttributes, speechletResponse) => {
                         callback(null, buildResponse(sessionAttributes, speechletResponse));
                     });
            break;
        case 'IntentRequest':
            onIntent(event.request,
                     event.session,
                     (sessionAttributes, speechletResponse) => {
                         callback(null, buildResponse(sessionAttributes, speechletResponse));
                     });
            break;
        case 'SessionEndedRequest':
            onSessionEnded(event.request, event.session);
            callback();
            break;
        }
    } catch (err) {
        callback(err);
    }
};
