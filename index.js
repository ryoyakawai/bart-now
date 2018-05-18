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
    let shouldEndSession = false;
    
    callback(sessionAttributes,
             buildSpeechletResponseSSML(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function handleSessionEndRequest(callback) {
    const cardTitle = 'Session Ended';
    const speechOutput = 'OK. See you soon. Have a great day!';

    let shouldEndSession = true;

    callback({}, buildSpeechletResponseSSML(cardTitle, speechOutput, null, shouldEndSession));
}

function handleCompleteSearchRequest(intent, session, callback) {
    const cardTitle = 'Session Ended';
    const yesNoResSlot = intent.slots.YES_NO_RES; 
    let speechOutput;
    let shouldEndSession = false;
    
    let resolution = yesNoResSlot.resolutions.resolutionsPerAuthority;
    let match = false;
    for(let i in resolution) {
        if(resolution[i].status.code == 'ER_SUCCESS_MATCH') {
            let res = resolution[i].values[0].value.name;
            switch(res) {
            case 'yes':
            case 'yup':
            case 'yeah':
                speechOutput = "Ok, let's start again. Tell me departure station.";
                break;
            case 'no':
            case 'nope':
                speechOutput = 'Thank you very much for using Catch Bart. See you soon!';
                shouldEndSession = true;
                break;
            }
            match = true;
            break;
        } 
    }

    if(match === false) {
        speechOutput = 'Sorry. I could not get your answer. Would you like to do another search?';
    }
    
    callback(session, buildSpeechletResponseSSML(cardTitle, speechOutput, null, shouldEndSession));
}

function handleUndefinedRequest(callback) {
    const sessionAttributes = {};
    const cardTitle = 'undefined';
    const speechOutput = "I couldn't understand what you have just said. <break time ='1s' /> Tell me the date of the schedule you would like to know again, please.";
    const repromptText = speechOutput;
    let shouldEndSession = false;

    callback(sessionAttributes,
             buildSpeechletResponseSSML(cardTitle, speechOutput, repromptText, shouldEndSession));    
}

/**
 * Set departure station in the session and prepares the speech to reply to the user.
 */
function setDepartureStationInSession(intent, session, callback) {
    if(typeof session.attributes.station == 'undefined') {
        session.attributes.station = {
            departure: null,
            destination: null,
            direction: null
        };
    }
    
    const cardTitle = intent.name;
    const bartStationSlot = intent.slots.BART_STATION;
    let shouldEndSession = false;
    let sessionAttrStation = session.attributes.station;
    let speechOutput = '';
    let repromptText = '';

    // matching the intents and slot
    let resolution = bartStationSlot.resolutions.resolutionsPerAuthority;
    let match = false, input_done = false, same_station = false;
    for(let i in resolution) {
        if(resolution[i].status.code == 'ER_SUCCESS_MATCH') {
            let selectedStation = resolution[i].values[0].value.name;
            let onlyDirect = bc.hasOnlyDirection(selectedStation);
            if( onlyDirect.status == false) {
                if(sessionAttrStation.departure === null) {
                    sessionAttrStation.departure = selectedStation;
                    speechOutput  = `Set ${sessionAttrStation.departure} as departure station. Now, tell me a destination by station name or direction, such as south or north.`;
                    repromptText = "Set ${bartDepartureStation} as departure station. Now, tell me a destination by station name or direction, such as south or north.";
                } else {
                    if(selectedStation.toLowerCase().match(/south|north/) !== null) {
                        sessionAttrStation.direction = selectedStation;
                        speechOutput  = `I got you. Going ${sessionAttrStation.direction}, departing from ${sessionAttrStation.departure}. `;
                        repromptText = `Going ${sessionAttrStation.direction}, departing from ${sessionAttrStation.departure}.`;
                    } else {
                        sessionAttrStation.destination = bartStationSlot.value;
                        let ret_direction = bc.getDirectionByDeptDest(sessionAttrStation.departure, sessionAttrStation.destination);
                        if(ret_direction == 'still') {
                            same_station = true;
                            break;
                        } else {
                            sessionAttrStation.direction = bc.getDirectionByDeptDest(sessionAttrStation.departure, sessionAttrStation.destination);
                        }
                        
                        speechOutput  = `I got you. Departing from ${sessionAttrStation.departure} to ${sessionAttrStation.destination}.`;
                        repromptText = `Departing from ${sessionAttrStation.departure} to ${sessionAttrStation.destination}`;
                    }
                    input_done = true;
                }
            } else {
                sessionAttrStation.departure = selectedStation;
                sessionAttrStation.direction = onlyDirect.onlyDirection;
                speechOutput = `Set ${sessionAttrStation.departure} as departure station. And ${sessionAttrStation.direction} is the only available direction from ${sessionAttrStation.departure} station. `;
                repromptText = `Set ${sessionAttrStation.departure} as departure station. And ${sessionAttrStation.direction} is the only available direction. So, let me start researching. `;
                input_done = true;
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
        if(same_station == false) {
            speechOutput = `Sorry, ${usersInput} is not valid input. Would you please try again?`;
            repromptText = `Sorry, ${usersInput} is not valid input. Would you please try again?`;
        } else {
            speechOutput = `${sessionAttrStation.departure} already set as departure station. Please choose different station. Which station would you like to set as destination? Both station name and direction is OK.`;
            repromptText = `${sessionAttrStation.departure} already set as departure station. Please choose different station.`;
        }
    }
    
    let sessionAttributes = session.attributes;
    sessionAttributes.station = sessionAttrStation;

    if(input_done == true && match == true ) {
        bc.getBartEtdByStationDirection(sessionAttrStation.departure, sessionAttrStation.direction).then( ret => {
            speechOutput += createInformation(ret);
            speechOutput +=  `<break time='0.5s' /> Would you like to do another search?`;
            //speechOutput +=  `<break time='0.5s' /> Thank you for using Catch Bart. Have a great day!`;
            //shouldEndSession = true;

            callback(sessionAttributes,
                     buildSpeechletResponseSSML(cardTitle, speechOutput, repromptText, shouldEndSession));
        });
    } else {
        callback(sessionAttributes,
                 buildSpeechletResponseSSML(cardTitle, speechOutput, repromptText, shouldEndSession));
    }
    
    function createInformation(ret) {
        let speech = [];
        speech.push(`Next train information at ${ret['departure']}.`);
        for(let dest in ret.info ) {
            let item = 0;
            if(ret.info[dest][item]['minutes'] == 'Leaving') {
                speech.push(`${dest} train is about leaving from platform ${ret.info[dest][item]['platform']}.`);
                if(typeof ret.info[dest][item+1] != 'undefined') speech.push(`And next one is coming in ${ret.info[dest][item+1]['minutes']} minutes coming to platform ${ret.info[dest][item+1]['platform']}.`);
            } else {
                speech.push(`${dest} train is coming to platform ${ret.info[dest][item]['platform']} in ${ret.info[dest][item]['minutes']} minutes.`);
                if(typeof ret.info[dest][item+1] != 'undefined') speech.push(`And next one is coming to platform ${ret.info[dest][item+1]['platform']} in ${ret.info[dest][item+1]['minutes']} minutes.`);
            }
            speech.push("<break time='0.5s'/>");
        }
        return "<break time='1.5s'/> " + speech.join(' ');
    }

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
    case 'SetMyStation':
        console.log(`[onIntent:${intent.slots.BART_STATION.value}] user_input=${intent.slots.BART_STATION.value}`);
        setDepartureStationInSession(intent, session, callback);
        break;
    case 'CompleteSearch':
        handleCompleteSearchRequest(intent, session, callback);
        console.log(`[onIntent] ${intentName}`);
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

    // Cleanup logic here
    session.attributes = {};
}

// --------------- Main handler -----------------------

exports.handler = (event, context, callback) => {
    try {
        console.log(`event.session.application.applicationId=${event.session.application.applicationId}`);
        
        // Only allow to access from specific SKILL
        if (event.session.application.applicationId !== SKILLID) {
            callback('[Invalid Application ID] invalid: ' + event.session.application.applicationId + ', valid: ' + SKILLID);
        }

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
