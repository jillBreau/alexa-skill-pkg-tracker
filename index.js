const Alexa = require('ask-sdk-core');
const persistenceAdapter = require('ask-sdk-s3-persistence-adapter');


let trackingNumberCharsGiven = "";

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speechText = 'Welcome to Package Tracker, you can say Add a Package, Remove a Package, or List my Packages!';
        
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
        const speechText = 'Hello there! Say Open Package Tracker to get started!';
        
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
        const speechText = 'You can say Add a Package to give me information about a new package you would like to track, you can say Remove a Package to make me forget a package and its information, or you can say List my Packages to hear the packages I already know about.';
        
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

        if (handlerInput.requestEnvelope.request.intent.slots.packageName.value) {

            const attributesManager = handlerInput.attributesManager;
            let sessionAttributes = attributesManager.getSessionAttributes() || [];
            sessionAttributes = isEmptyObject(sessionAttributes) ? [] : sessionAttributes;

            for (const package of sessionAttributes) {
                let existingPackageName = package.hasOwnProperty('packageName') ? package.packageName : "";
                
                if (handlerInput.requestEnvelope.request.intent.slots.packageName.value == existingPackageName) {

                    let speak = `You already have a package named ${existingPackageName}. Please provide a new, unique package name.`;
                    let reprompt = `Please provide a name other than ${existingPackageName} to identify this package.`;

                    return handlerInput.responseBuilder
                        .speak(speak)
                        .reprompt(reprompt)
                        .addElicitSlotDirective('packageName')
                        .getResponse();

                }
            }

        }

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
        
        const newPackageAttributes = {
            "packageName" : packageName,
            "shippingCompany" : shippingCompany,
            "trackingNumber" : trackingNumber
        };

        const attributesManager = handlerInput.attributesManager;
        let sessionAttributes = attributesManager.getSessionAttributes() || [];
        sessionAttributes = isEmptyObject(sessionAttributes) ? [] : sessionAttributes;

        sessionAttributes.push(newPackageAttributes);
        
        attributesManager.setPersistentAttributes(sessionAttributes);
        await attributesManager.savePersistentAttributes();

        handlerInput.requestEnvelope.request.intent.slots.packageName.value = null;
        handlerInput.requestEnvelope.request.intent.slots.shippingCompany.value = null;
        handlerInput.requestEnvelope.request.intent.slots.trackingNumberLength.value = null;
        handlerInput.requestEnvelope.request.intent.slots.trackingNumberChar.value = null;
        trackingNumberCharsGiven = "";

        const speakOutput = `I now know that you have a package called ${packageName} coming from the shipping company ${shippingCompany} with the tracking number ${trackingNumber}.`;
        
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
        let sessionAttributes = attributesManager.getSessionAttributes() || [];

        sessionAttributes = isEmptyObject(sessionAttributes) ? [] : sessionAttributes;

        let packageNames = [];

        for (const package of sessionAttributes) {
            let packageName = package.hasOwnProperty('packageName') ? package.packageName : "";
            packageNames.push(packageName);
        }

        let packageNamesString = packageNames.join(", ").replace(/,(?=[^,]*$)/, ' and');

        let speakOutput = `Your current packages are called ${packageNamesString}.`
        if (packageNames.length === 1) {
            speakOutput = `Your current package is called ${packageNamesString}.`
        } else if (packageNames.length === 0) {
            speakOutput = "You have no current packages."
        }

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};


const InProgressRemovePackageIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "RemovePackageIntent"
            && handlerInput.requestEnvelope.request.dialogState !== 'COMPLETED';
    },
    handle(handlerInput) {

        const removePackageName = handlerInput.requestEnvelope.request.intent.slots.removePackageName.value;

        if (removePackageName) {

            const attributesManager = handlerInput.attributesManager;
            let sessionAttributes = attributesManager.getSessionAttributes() || [];
            sessionAttributes = isEmptyObject(sessionAttributes) ? [] : sessionAttributes;

            let thisPackageExists = false;
            let existingPackageNames = [];

            for (const package of sessionAttributes) {
                let existingPackageName = package.hasOwnProperty('packageName') ? package.packageName : "";
                existingPackageNames.push(existingPackageName);

                if (removePackageName == existingPackageName) {
                    thisPackageExists = true;
                }
            }

            if (!thisPackageExists) {

                let packageNamesString = existingPackageNames.join(", ").replace(/,(?=[^,]*$)/, ' or');

                let speak = `You do not have a package named ${removePackageName}. Please provide the name of a package that you have, in order to remove it.`;
                let reprompt = `Please provide the name of the package you would like to remove. Your options are ${packageNamesString}.`;

                return handlerInput.responseBuilder
                    .speak(speak)
                    .reprompt(reprompt)
                    .addElicitSlotDirective('removePackageName')
                    .getResponse();
            }
        }

        return handlerInput.responseBuilder
            .addDelegateDirective()
            .getResponse();
    }
};


const CompletedRemovePackageIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "RemovePackageIntent"
            && handlerInput.requestEnvelope.request.dialogState === 'COMPLETED';
    },
    async handle(handlerInput) {

        const removePackageName = handlerInput.requestEnvelope.request.intent.slots.removePackageName.value

        const attributesManager = handlerInput.attributesManager;
        let sessionAttributes = attributesManager.getSessionAttributes() || [];
        sessionAttributes = isEmptyObject(sessionAttributes) ? [] : sessionAttributes;

        var remainingSessionAttributes = sessionAttributes
            .filter(function(value, index, arr) { 
            return value.packageName !== removePackageName;
        });

        attributesManager.setPersistentAttributes(remainingSessionAttributes);
        await attributesManager.savePersistentAttributes();

        handlerInput.requestEnvelope.request.intent.slots.removePackageName.value = null;

        let speakOutput = `The package ${removePackageName} was removed.`
        if (remainingSessionAttributes.length == sessionAttributes.length) {
            speakOutput = `There was no package called ${removePackageName} to remove.`
        }

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};


const LoadPackageInterceptor = {
    async process(handlerInput) {

        const attributesManager = handlerInput.attributesManager;
        let sessionAttributes = await attributesManager.getPersistentAttributes() || [];
        sessionAttributes = isEmptyObject(sessionAttributes) ? [] : sessionAttributes;

        if (sessionAttributes) {
            attributesManager.setSessionAttributes(sessionAttributes);
        }
    }
};


function isEmptyObject(param) {
    for(var property in param) {
        if(param.hasOwnProperty(property)) {
            return false;
        }
    }
    return JSON.stringify(param) === JSON.stringify({});
}


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
        ListPackagesIntentHandler,
        InProgressRemovePackageIntentHandler,
        CompletedRemovePackageIntentHandler
    )
    .addRequestInterceptors(LoadPackageInterceptor)
    .addErrorHandlers(ErrorHandler)
    .lambda();