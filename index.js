'use strict';

const SKILLID = 'amzn1.ask.skill.02aafc22-ff0a-47f6-b7e6-acf978bd0f42';
const BartConnector = require('./scripts/bartconnector.js');
const bc = new BartConnector();

const buildSpeechletResponseSSML = (cardContent, output_ssml, repromptText_ssml, shouldEndSession) => {
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
            title: cardContent.title + ' - Catch Bart',
            content: cardContent.content
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
};

const buildResponse = (sessionAttributes, speechletResponse) => {
    return {
        version: '1.0',
        sessionAttributes,
        response: speechletResponse
    };
};


// --------------- Functions that control the skill's behavior -----------------------

const getWelcomeResponse = (session, callback) => {
    let sessionAttributes = session.attributes;

    sessionAttributes = {
        station: {
            departure: null,
            destination: null,
            direction: null
        }
    };

    const speechOutput = "Hi. Wellcome to Catch Bart. Tell me departure station.";
    const repromptText = speechOutput;
    const cardContent = {
        title: 'Welcome',
        content: 'Tell me Departure Station.'
    };
    let shouldEndSession = false;
    
    callback(sessionAttributes,
             buildSpeechletResponseSSML(cardContent, speechOutput, repromptText, shouldEndSession));
};

const handleSessionEndRequest = (callback) => {
    const speechOutput = 'OK. See you next time.';
    const cardContent = {
        title: 'Bye',
        content: 'Thank you for using. See you next time.'
    };
    let shouldEndSession = true;

    callback({}, buildSpeechletResponseSSML(cardContent, speechOutput, null, shouldEndSession));
};

const handleCompleteSearchRequest = (intent, session, callback) => {
    const yesNoResSlot = intent.slots.YES_NO_RES; 
    let speechOutput;
    const cardContent = {
        title: '',
        content: ''
    };
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
                speechOutput = "OK, let's start again. Tell me departure station.";
                cardContent.title = 'Search schedule';
                cardContent.content = 'Tell me Departure Station.';
                break;
            case 'no':
            case 'nope':
                speechOutput = 'Thank you very much for using Catch Bart. See you soon!';
                cardContent.title = 'Thank you.';
                cardContent.content = 'See you soon!';
                shouldEndSession = true;
                break;
            }
            match = true;
            break;
        } 
    }

    if(match === false) {
        speechOutput = 'Sorry. I could not get your answer. Would you like to do another search? Say Yes to continue, say No to quit.';
    }
    
    callback(session, buildSpeechletResponseSSML(cardContent, speechOutput, null, shouldEndSession));
};

const handleHelpRequest = (intent, session, callback) => {
    let sessionAttributes = session.attributes;
    let speechOutput;
    let cardContent = {
        title: '',
        content: ''
    };

    speechOutput = 'This skill is to provide next Bart train schedule of what you request. So, tell me departure station.';
    cardContent.title = 'Help';
    cardContent.content = 'Provide you Bart schedule. Tell me Departure Station.';
    if(session.attributes.station.departure !== null
      && (bc.hasOnlyDirection(session.attributes.station.departure)).status === false) {
       if(session.attributes.station.destination === null || session.attributes.station.direction === null) {
           speechOutput = `Now, departre station is set ${session.attributes.station.departure}. So tell me a destination by station name or direction, such as south or north.`;
           cardContent.title = 'Help';
           cardContent.content = `Provide you Bart schedule departing from ${session.attributes.station.departure}. Where do you want to go?`;
       }
    }
    
    const repromptText = speechOutput;
    let shouldEndSession = false;

    callback(sessionAttributes,
             buildSpeechletResponseSSML(cardContent, speechOutput, repromptText, shouldEndSession));    
};

const handleUndefinedRequest = (intent, session, callback) => {
    let sessionAttrStation = session.attributes.station;
    const speechOutput = "Sorry, I couldn't understand what you have just said.";
    let cardContent = {
        title: 'Unrecognized',
        content: ''
    };
    const repromptText = speechOutput;
    let shouldEndSession = false;

    let out = ' Tell me departure station.';
    cardContent.content = "Tell me departure station.";
    if(typeof sessionAttrStation !== 'undefined') {
        if(sessionAttrStation.destination === null
           && sessionAttrStation.direction === null) {
            out = ' Tell me destination station.';
            cardContent.content = "Tell me destinamtion station.";
        }
    }
    speechOutput += out;
    
    callback(sessionAttrStation,
             buildSpeechletResponseSSML(cardContent, speechOutput, repromptText, shouldEndSession));    
};

/**
 * Set departure station in the session and prepares the speech to reply to the user.
 */
const setStationInformationInSession = (intent, session, callback) => {
    if(typeof session.attributes.station == 'undefined') {
        session.attributes.station = {
            departure: null,
            destination: null,
            direction: null
        };
    }
    
    const bartStationSlot = intent.slots.BART_STATION;
    let shouldEndSession = false;
    let sessionAttrStation = session.attributes.station;
    let speechOutput = null;
    let cardContent = {
        title: '',
        content: ''
    };
    let repromptText = '';

    // matching the intents and slot
    let resolution = bartStationSlot.resolutions.resolutionsPerAuthority;
    let match = false, input_done = false, same_station = false;
    for(let i in resolution) {
        if(resolution[i].status.code == 'ER_SUCCESS_MATCH') {
            let selectedStation = resolution[i].values[0].value.name;
            let onlyDirect = bc.hasOnlyDirection(selectedStation);

            if(sessionAttrStation.departure === null
               && selectedStation.toLowerCase().match(/south|north/) !== null) {
                speechOutput = `${selectedStation} is not able to set as departure station. Would you please tell me departure station?`;
                repromptText = speechOutput; 
                cardContent.title = 'Invalid Departure station';
                cardContent.content = `Tell me departure station. (invalid:${selectedStation})`;
            } else
            if(onlyDirect.status !== false
               && sessionAttrStation.departure === null) {
                sessionAttrStation.departure = selectedStation;
                sessionAttrStation.direction = onlyDirect.onlyDirection;
                speechOutput = `Set ${sessionAttrStation.departure} as departure station. ${sessionAttrStation.direction} is the only available direction from ${sessionAttrStation.departure} station. `;
                cardContent.title = `Next Train Schedule : ${sessionAttrStation.departure}`;
                cardContent.content = ''; //`${sessionAttrStation.direction} bound.`;
                input_done = true;
            } else {
                if(sessionAttrStation.departure === null) {
                    sessionAttrStation.departure = selectedStation;
                    speechOutput = `Set ${sessionAttrStation.departure} as departure station. Now, tell me destination by station name or direction, such as south or north.`;
                    cardContent.title = 'Tell me destination.';
                    cardContent.content = `Tell me destination station. \n(Departure: ${sessionAttrStation.departure})`;
                    repromptText = speechOutput;
                } else {
                    if(selectedStation.toLowerCase().match(/south|north/) !== null) {
                        sessionAttrStation.direction = selectedStation;
                        speechOutput  = `I got you. Going ${sessionAttrStation.direction}, departing from ${sessionAttrStation.departure}. `;
                        cardContent.title = `Next Train Schedule : ${sessionAttrStation.departure}`;
                        cardContent.content = ''; //`${sessionAttrStation.direction} bound.`;
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
                        cardContent.title = `Next Train Schedule : ${sessionAttrStation.departure}`;
                        cardContent.content = '';
                    }
                    input_done = true;
                }
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
        if(speechOutput === null) {
            if(same_station == false) {
                speechOutput = `Sorry, ${usersInput} is invalid for station name or for direction.`;
                if(sessionAttrStation.departure === null) {
                    speechOutput += ` Would you tell me departure station?`;
                    cardContent.title = 'Tell me Departure';
                    cardContent.content = `Tell me departure station.`;
                } else {
                    speechOutput += ` Would you tell me destination station?`;
                    cardContent.title = 'Tell me destination.';
                    cardContent.content = `Tell me destination station. (Departure: ${sessionAttrStation.departure})`;
                }
                repromptText = speechOutput;
            } else {
                speechOutput = `${sessionAttrStation.departure} is already set as departure station. Please choose different station. Which station would you like to set as destination? Both station name and direction is OK.`;
                repromptText = speechOutput;
                cardContent.title = 'Tell me destination.';
                cardContent.content = `Tell me destination station. ${sessionAttrStation.departure} is set to departure station.`;
            }
        }
    }
    
    let sessionAttributes = session.attributes;
    sessionAttributes.station = sessionAttrStation;

    if(input_done == true && match == true ) {
        bc.getBartEtdByStationDirection(sessionAttrStation.departure, sessionAttrStation.direction).then( ret => {
            let trainSchedule = createResultSpeech(ret);
            speechOutput += trainSchedule.speech;
            speechOutput +=  `<break time='0.5s' /> Would you like to do another search?`;
            cardContent.content = trainSchedule.text + "\n" + ' Get another schedule?';

            sessionAttributes.station = {
                departure: null,
                destination: null,
                direction: null
            };
            
            callback(sessionAttributes,
                     buildSpeechletResponseSSML(cardContent, speechOutput, repromptText, shouldEndSession));
        });
    } else {
        callback(sessionAttributes,
                 buildSpeechletResponseSSML(cardContent, speechOutput, repromptText, shouldEndSession));
    }

    const createResultSpeech = (ret) => {
        console.log('[createResultSpeech] ', ret);
        let speech = [], text = [];
        let out = {
            speech: null,
            text: null
        };
        let next_train_exists = false;
        speech.push(`Next ${ret['direction']} bound train information at ${ret['departure']} Bart station.`);
        let capBound = cap1stLetter(ret['direction']);
        text.push(`${capBound} bound :` + "\r\n");
        for(let dest in ret.info ) {
            let item = 0;
            if(ret.info[dest][item]['minutes'] == 'Leaving') {
                speech.push(`${dest} train is about leaving from platform ${ret.info[dest][item]['platform']}.`);
                text.push(`[${dest}] ` + "\r\n" + `- About Leaving <P: ${ret.info[dest][item]['platform']}>` + "\r\n");
                if(typeof ret.info[dest][item+1] != 'undefined') {
                    speech.push(`And next train is coming in ${ret.info[dest][item+1]['minutes']} minutes coming to platform ${ret.info[dest][item+1]['platform']}.`);
                    text.push(` - ${ret.info[dest][item+1]['minutes']} mins <P: ${ret.info[dest][item+1]['platform']}>`);
                }
                next_train_exists = true;
            } else {
                speech.push(`${dest} train is coming to platform ${ret.info[dest][item]['platform']} in ${ret.info[dest][item]['minutes']} minutes.`);
                text.push(`[${dest}] ` + "\r\n" + `- ${ret.info[dest][item]['minutes']} mins <P: ${ret.info[dest][item]['platform']}>` + "\r\n");
                if(typeof ret.info[dest][item+1] != 'undefined') {
                    speech.push(`And next train is coming to platform ${ret.info[dest][item+1]['platform']} in ${ret.info[dest][item+1]['minutes']} minutes.`);
                    text.push(`- ${ret.info[dest][item+1]['minutes']} mins <P: ${ret.info[dest][item+1]['platform']}>` + "\r\n");
                }
                next_train_exists = true;
            }
            speech.push("<break time='0.5s'/>");
        }
        if(next_train_exists === true) {
            out.speech = "<break time='1.0s'/> " + speech.join(' ');
            out.text = text.join(' ');
        } else {
            out.speech = "<break time='1.0s'/> " + ` I am sorry to tell you this. Unfortunately, there are not ${ret['direction']} bound train at ${ret['departure']} Bart station for today.`;
            out.text = 'Unfortunately, no train for today.';
        }
        console.log('[createResultSpeech] ', out);
        return out;

    };
    const cap1stLetter = (word) => {
        return word.substring(0, 1).toUpperCase() + word.substring(1);
    };
        

};

// --------------- Events -----------------------

/**
 * Called when the session starts.
 */
const onSessionStarted = (sessionStartedRequest, session) => {
    console.log(`onSessionStarted requestId=${sessionStartedRequest.requestId}, sessionId=${session.sessionId}`);
};

/**
 * Called when the user launches the skill without specifying what they want.
 */
const onLaunch = (launchRequest, session, callback) => {
    console.log(`onLaunch requestId=${launchRequest.requestId}, sessionId=${session.sessionId}`);

    getWelcomeResponse(session, callback);
};

/**
 * Called when the user specifies an intent for this skill.
 */
const onIntent = (intentRequest, session, callback) => {
    console.log(`[onIntent] intentname=${intentRequest.intent.name}, requestId=${intentRequest.requestId}, sessionId=${session.sessionId}`);

    const intent = intentRequest.intent;
    const intentName = intentRequest.intent.name;

    // Dispatch to your skill's intent handlers
    switch(intentName) {
    case 'SetMyStation':
        console.log(`[onIntent:${intent.slots.BART_STATION.value}] user_input=${intent.slots.BART_STATION.value}`);
        setStationInformationInSession(intent, session, callback);
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
    case 'AMAZON.HelpIntent':
        console.log('Intent: ' + intentName );
        handleHelpRequest(intent, session, callback);
        break;
    default:
        handleUndefinedRequest(intent, session, callback);
        break;
    }
};

/**
 * Called when the user ends the session.
 * This is not called when the skill returns shouldEndSession = true.
 */
const onSessionEnded = (sessionEndedRequest, session) => {
    console.log(`onSessionEnded requestId=${sessionEndedRequest.requestId}, sessionId=${session.sessionId}`);

    // Cleanup logic here
    session.attributes = {};
};

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
