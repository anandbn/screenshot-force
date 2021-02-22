({
    doInit: function(component, event, helper) {
        var filter = {
            "datasets": {
                "ProductSalesWithHierarchy": [
                    {
                        "fields": [
                            "RepName"
                        ],
                        "filter": {
                            "operator": "in",
                            "values": [
                                "Abraham Norman"
                            ]
                        }
                    }
                ]
            }
        };
        
        var json = JSON.stringify(filter, null, 2);
        component.set('v.filter', json);  
    },
    
    handleUpdate: function(component, event, helper) {
        debugger;
        var filter = component.get('v.filter');
        var dashboardId = component.get('v.dashboardId');
        console.warn("dashboardId: ", dashboardId, ", filter: ", filter);
        var evt = $A.get('e.wave:update');
        evt.setParams({
            value: filter,
            id: dashboardId,
            type: "dashboard"
        });
        evt.fire();
    }
})