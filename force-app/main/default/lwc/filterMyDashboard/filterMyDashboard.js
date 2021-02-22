import { LightningElement,track,wire } from 'lwc';
import analyticsFilterChannel from '@salesforce/messageChannel/AnalyticsFilterChannel__c';
import { publish, MessageContext } from 'lightning/messageService';

export default class FilterMyDashboard extends LightningElement {

    @track selectedSalesRep;

    @wire(MessageContext)
    messageContext;

    connectedCallback() {
        let uri = new URL(decodeURI(window.location));
        this.selectedSalesRep = uri.hash.substring(1).split('=')[1];
        this.selectedSalesRep = decodeURIComponent(this.selectedSalesRep);
        console.log(`>>>>>>>> SALES REP : ${this.selectedSalesRep}`);
        setTimeout(()=>{
            publish(this.messageContext, analyticsFilterChannel, {"salesRep":this.selectedSalesRep});
        }, 10000);
        
    }
    
    fireFilterEvent(){
        
    }
    
    get options() {
        return [
            { 'label':'Bruce Kennedy', 'value':'Bruce Kennedy'},
            { 'label':'Catherine Brown', 'value':'Catherine Brown'},
            { 'label':'Chris Riley', 'value':'Chris Riley'},
            { 'label':'Dennis Howard', 'value':'Dennis Howard'},
            { 'label':'Doroth Gardner', 'value':'Doroth Gardner'},
            { 'label':'Eric Gutierrez', 'value':'Eric Gutierrez'},
            { 'label':'Eric Sanchez', 'value':'Eric Sanchez'},
            { 'label':'Evelyn Williamson', 'value':'Evelyn Williamson'},
            { 'label':'Harold Campbell', 'value':'Harold Campbell'},
            { 'label':'Irene Kelley', 'value':'Irene Kelley'},
            { 'label':'Irene McCoy', 'value':'Irene McCoy'},
            { 'label':'John Williams', 'value':'John Williams'},
            { 'label':'Johnny Green', 'value':'Johnny Green'},
            { 'label':'Kelly Frazier', 'value':'Kelly Frazier'},
            { 'label':'Laura Garza', 'value':'Laura Garza'},
            { 'label':'Laura Palmer', 'value':'Laura Palmer'},
            { 'label':'Nicolas Weaver', 'value':'Nicolas Weaver'},
        ];
    }

    handleChange(event) {
        this.selectedSalesRep = event.detail.value;
        
        publish(this.messageContext, analyticsFilterChannel, {"salesRep":this.selectedSalesRep});
    }

}