({
    handleFilterMessage: function (cmp, message, helper) {

        if (message != null) {
            var evt = $A.get('e.wave:update');
            //{"oppty_test": {"StageName": ["Closed Won"]}}
            let myFilter = {
                "datasets" : {
                    "thesaasguy__DTC_Opportunity_SAMPLE":[
                        {
                            "fields": ["Opportunity_Owner"], 
                            "selection": [message.getParam('salesRep')]
                        }
                    ]
                }
            };
            evt.setParams({
                value:JSON.stringify(myFilter) ,
                devName: 'thesaasguy__Opportunity_Details',
                type: "dashboard"
            });
            evt.fire();    
        }
        
    },
    handleSelectionChanged: function (component, event, helper) {
        var params = event.getParams();
        var payload = params.payload;
        if (payload) {
            var step = payload.step;
            var data = payload.data;
            data.forEach(function (obj) {
                for (var k in obj) {
                    if (k === 'Id') {
                        component.set("v.recordId", obj[k]);
                    }
                }
            });
        }
    }
})