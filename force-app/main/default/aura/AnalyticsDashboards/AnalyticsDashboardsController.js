({
    doInit: function( cmp, event, helper ) {

        cmp.find( 'restClient' ).restRequest({
            'url' : '/services/data/v44.0/wave/dashboards',
            'method' : 'get'
        }).then( $A.getCallback( function( response ) {
            var actions = [
                { label: 'Details', name: 'show_details' },
                { label: 'Email', name: 'email' }
            ]; 
            var theDashboards = response.dashboards;
            theDashboards.forEach(function(element) {
                element.folderName=element.folder.label;
                element.lastModifiedBy=element.lastModifiedBy.name;
            });
           cmp.set('v.dashboards',theDashboards);
           cmp.set('v.columns', [
                {label: 'Name', fieldName: 'label', type: 'text'},
               {label: 'Folder', fieldName: 'folderName', type: 'text'},
               {label: 'Last Modified',fieldName:'lastModifiedDate',type:'date'},
               {label: 'Last Modified By', fieldName: 'lastModifiedBy', type: 'text'},
               { type: 'action', typeAttributes: { rowActions: actions }}
           ]);
        })).catch( $A.getCallback( function( err ) {
            // handle error
        }));

    },
    handleRowAction: function (cmp, event, helper) {
        var action = event.getParam('action');
        var row = event.getParam('row');
        
        switch (action.name) {
            case 'show_details':
                alert('Showing Details: ' + JSON.stringify(row));
                break;
            case 'email':
                var windowObjectReference;
                windowObjectReference = window.open("http://localhost\:3000?name="+row.label+'&id='+row.id, "Screenshot Force");
                
        }   
    }
})