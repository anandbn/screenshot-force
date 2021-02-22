({
    // Sets an empApi error handler on component initialization
    onInit: function (component, event, helper) {
        // Get the empApi component
        const empApi = component.find('empApi');

        // Uncomment below line to enable debug logging (optional)
        // empApi.setDebugFlag(true);

        // Register error listener and pass in the error handler function
        empApi.onError($A.getCallback(error => {
            // Error can be any type of error (subscribe, unsubscribe...)
            console.error('EMP API error: ', JSON.stringify(error));
        }));

        // Get the channel from the input box
        const channel = '/event/thesaasguy__Message__e'
        // Replay option to get new events
        const replayId = -1;

        // Subscribe to an event
        empApi.subscribe(channel, replayId, $A.getCallback(eventReceived => {
            // Process event (this is called each time we receive an event)
            console.log('Received event ', JSON.stringify(eventReceived));
            var messages = component.get('v.messages');
            var msgGroups = component.get('v.messageGroups');
            if (!msgGroups) {
                msgGroups = new Array();
            }
            var group = eventReceived.data.payload.thesaasguy__Group__c;
            var msgGroup;
            for (var i = 0; i < msgGroups.length; i++) {
                if (msgGroups[i].group === group) {
                    msgGroup = msgGroups[i];
                    break;
                }
            }
            if (!msgGroup) {
                msgGroup = { "group": group, "messages": new Array() };
                msgGroups.push(msgGroup);
            }

            if (eventReceived.data.payload.thesaasguy__Status__c) {
                msgGroup.status = eventReceived.data.payload.thesaasguy__Status__c;
            }

            msgGroup.messages.push(eventReceived.data.payload.thesaasguy__Log_Message__c);
            component.set('v.messageGroups', msgGroups);
        })).then(subscription => {
            // Subscription response received.
            // We haven't received an event yet.
            console.log('Subscription request sent to: ', subscription.channel);
            // Save subscription to unsubscribe later
            component.set('v.subscription', subscription);
        });
    },

    // Invokes the subscribe method on the empApi component
    subscribe: function (component, event, helper) {

    },

    // Invokes the unsubscribe method on the empApi component
    unsubscribe: function (component, event, helper) {
        // Get the empApi component
        const empApi = component.find('empApi');
        // Get the subscription that we saved when subscribing
        const subscription = component.get('v.subscription');

        // Unsubscribe from event
        empApi.unsubscribe(subscription, $A.getCallback(unsubscribed => {
            // Confirm that we have unsubscribed from the event channel
            console.log('Unsubscribed from channel ' + unsubscribed.subscription);
            component.set('v.subscription', null);
        }));
    }
})