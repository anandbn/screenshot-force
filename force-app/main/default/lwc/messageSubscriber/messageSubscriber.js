import { LightningElement, wire } from 'lwc';

import {
    subscribe,
    unsubscribe,
    APPLICATION_SCOPE,
    MessageContext
} from 'lightning/messageService';
import analyticsFilterChannel from '@salesforce/messageChannel/AnalyticsFilterChannel__c';

export default class MessageSubscriber extends LightningElement {

    subscription = null;

    @wire(MessageContext)
    messageContext;

    connectedCallback() {
        this.subscription = subscribe(
            this.messageContext,
            analyticsFilterChannel,
            (message) => this.handleMessage(message),
            { scope: APPLICATION_SCOPE }
        );

    }

    // Handler for message received by component
    handleMessage(message) {
        console.log(message);
    }

}