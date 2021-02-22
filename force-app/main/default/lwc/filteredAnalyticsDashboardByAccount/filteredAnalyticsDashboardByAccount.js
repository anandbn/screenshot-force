import { LightningElement,wire,track } from 'lwc';

import getAccounts from '@salesforce/apex/FilteredDashboardsUtils.getAccounts';

const ROW_ACTIONS =[
    { label: 'Email', name: 'email' }
]; 
export default class FilteredAnalyticsDashboardByAccount extends LightningElement {

    
    tableColumns = [
        {label: 'Name', fieldName: 'Name', type: 'text'},
        {label: 'Id', fieldName: 'Id', type: 'text'},
       { type: 'action', typeAttributes: { rowActions: ROW_ACTIONS }}
    ];

    @track theAccounts;

    @wire(getAccounts)
    getAccounts({error,data}){
        if(data){
            this.theAccounts=data;
        }
        if(error){
            console.log(JSON.stringify(error));
        }
    }
    theAccounts;

    get hasAccounts(){
        return this.theAccounts!=null; 
    }

    handleRowAction(event) {
        const actionName = event.detail.action.name;
        const row = event.detail.row;
        
        switch (actionName) {
            case 'email':
                var windowObjectReference;
                windowObjectReference = window.open("http://localhost\:3000/account?name="+row.Name+'&id='+row.Id, "Screenshot Force");
                
        }   
    }
}