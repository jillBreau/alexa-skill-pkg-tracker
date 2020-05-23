const Alexa = require('ask-sdk-core');
const persistenceAdapter = require('ask-sdk-s3-persistence-adapter');


let trackingNumberCharsGiven = "";

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speechText = 'Welcome to Package Tracker, you can say Add a Package, or Track my Package!';
        
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .withSimpleCard('Hello World', speechText)
            .getResponse();
    }
};


const HelloWorldIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'HelloWorldIntent';
    },
    handle(handlerInput) {
        const speechText = 'Hello World!';
        
        return handlerInput.responseBuilder
            .speak(speechText)
            .withSimpleCard('Hello World', speechText)
            .getResponse();
    }
};


const HelpIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speechText = 'You can say Add a Package to give me information about a new package you would like to track, or you can say Track my Package to get tracking information on a package I already know about.';
        
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .withSimpleCard('Hello World', speechText)
            .getResponse();
    }
};


const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
                || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speechText = 'Goodbye from Package Tracker!';
        
        return handlerInput.responseBuilder
            .speak(speechText)
            .withSimpleCard('Hello World', speechText)
            .withShouldEndSession(true)
            .getResponse();
    }
};


const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        return handlerInput.responseBuilder.getResponse();
    }
};


const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log(`Error handled: ${error.message}`);
        
        return handlerInput.responseBuilder
            .speak('Sorry, I can\'t understand the command. Please say it again.')
            .reprompt('Sorry, I can\'t understand the command. Please say it again.')
            .getResponse();
    },
};


const InProgressAddPackageIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "AddPackageIntent"
            && handlerInput.requestEnvelope.request.dialogState !== 'COMPLETED';
    },
    handle(handlerInput) {

        return handlerInput.responseBuilder
            .addDelegateDirective()
            .getResponse();
    }
};

const RequiredSlotsFilledAddPackageIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "AddPackageIntent"
            && handlerInput.requestEnvelope.request.intent.slots.packageName.value
            && handlerInput.requestEnvelope.request.intent.slots.shippingCompany.value 
            && handlerInput.requestEnvelope.request.intent.slots.trackingNumberLength.value 
            && handlerInput.requestEnvelope.request.intent.slots.trackingNumberLength.value > trackingNumberCharsGiven.length + 1
    },
    handle(handlerInput) {

        if (handlerInput.requestEnvelope.request.intent.slots.trackingNumberChar.value) {
            trackingNumberCharsGiven = trackingNumberCharsGiven.concat(handlerInput.requestEnvelope.request.intent.slots.trackingNumberChar.value)
        }

        let speak = "Next character?";
        let reprompt = "What is the next number or letter of your tracking number?";
        if (trackingNumberCharsGiven.length == 0) {
            speak = "What is the first character of your tracking number?";
            reprompt = "What is the first number or letter of your tracking number?";

        }
        return handlerInput.responseBuilder
            .speak(speak)
            .reprompt(reprompt)
            .addElicitSlotDirective('trackingNumberChar')
            .getResponse();
    }
};


const CompletedAddPackageIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "AddPackageIntent"
            && handlerInput.requestEnvelope.request.dialogState === "COMPLETED";
    },
    async handle(handlerInput){

        if (handlerInput.requestEnvelope.request.intent.slots.trackingNumberChar.value) {
            trackingNumberCharsGiven = trackingNumberCharsGiven.concat(handlerInput.requestEnvelope.request.intent.slots.trackingNumberChar.value)
        }

        const packageName = handlerInput.requestEnvelope.request.intent.slots.packageName.value;
        const shippingCompany = handlerInput.requestEnvelope.request.intent.slots.shippingCompany.value;
        const trackingNumber = trackingNumberCharsGiven.toUpperCase();
        
        const attributesManager = handlerInput.attributesManager;
        const packageAttributes = {
            "packageName" : packageName,
            "shippingCompany" : shippingCompany,
            "trackingNumber" : trackingNumber
        };
        
        attributesManager.setPersistentAttributes(packageAttributes);
        await attributesManager.savePersistentAttributes();

        handlerInput.requestEnvelope.request.intent.slots.packageName.value = null;
        handlerInput.requestEnvelope.request.intent.slots.shippingCompany.value = null;
        handlerInput.requestEnvelope.request.intent.slots.trackingNumberLength.value = null;
        handlerInput.requestEnvelope.request.intent.slots.trackingNumberChar.value = null;
        trackingNumberCharsGiven = "";

        const speakOutput = `It looks like your package called ${packageName} is coming from the shipping company ${shippingCompany} with the tracking number ${trackingNumber}`;
        
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};


const ListPackagesIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "ListPackagesIntent";
    },
    handle(handlerInput) {

        const attributesManager = handlerInput.attributesManager;
        const sessionAttributes = attributesManager.getSessionAttributes() || {};

        const packageName = sessionAttributes.hasOwnProperty('packageName') ? sessionAttributes.packageName : "";
        const shippingCompany = sessionAttributes.hasOwnProperty('shippingCompany') ? sessionAttributes.shippingCompany : "";
        const trackingNumber = sessionAttributes.hasOwnProperty('trackingNumber') ? sessionAttributes.trackingNumber : "";

        let speakOutput = `Your current package is called ${packageName}. It is being shipped by ${shippingCompany} with the tracking number ${trackingNumber}.`;
        if (!packageName || !shippingCompany || !trackingNumber) {
            speakOutput = "You have no current packages"
        }

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};


const LoadPackageInterceptor = {
    async process(handlerInput) {
        const attributesManager = handlerInput.attributesManager;
        const sessionAttributes = await attributesManager.getPersistentAttributes() || {};

        const packageName = sessionAttributes.hasOwnProperty('packageName') ? sessionAttributes.packageName : "";
        const shippingCompany = sessionAttributes.hasOwnProperty('shippingCompany') ? sessionAttributes.shippingCompany : "";
        const trackingNumber = sessionAttributes.hasOwnProperty('trackingNumber') ? sessionAttributes.trackingNumber : "";

        if (packageName && shippingCompany && trackingNumber) {
            attributesManager.setSessionAttributes(sessionAttributes);
        }
    }
};


/**
 * This handler routes all request and response payloads to the handlers above
 * The handlers are processed top to bottom
 **/
exports.handler = Alexa.SkillBuilders.custom()
    .withPersistenceAdapter(
        new persistenceAdapter.S3PersistenceAdapter({bucketName:'myawsbucketjillbreau'})
    )
    .addRequestHandlers(
        LaunchRequestHandler,
        HelloWorldIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler,
        InProgressAddPackageIntentHandler,
        RequiredSlotsFilledAddPackageIntentHandler,
        CompletedAddPackageIntentHandler,
        ListPackagesIntentHandler
    )
    .addRequestInterceptors(LoadPackageInterceptor)
    .addErrorHandlers(ErrorHandler)
    .lambda();