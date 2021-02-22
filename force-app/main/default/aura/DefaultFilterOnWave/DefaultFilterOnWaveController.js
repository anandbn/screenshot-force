({
    doInit: function(component, event, helper) {
        component.set('v.filter', '');    
    },
    handleSendFilter: function(component, event, helper) {
        debugger;
        var filter = {
            datasets:{
                "ProductSalesWithHierarchy":[
                    {
                        fields:[
                            "RepName"
                        ],
                        filter:{
                            operator:"in",
                            values:[
                                "Abraham Norman"
                            ]
                        }
                    }
                ]
            }
        };        
        //var filter = component.get('v.filter');
        var dashboardId = component.get('v.dashboardId');
        console.warn("Dashboard:"+dashboardId+",filter:"+JSON.stringify(filter));
        var evt = $A.get('e.wave:update');
        evt.setParams({
            value: filter,
            id: dashboardId,
            type: "dashboard"
        });
        evt.fire();
    }
})