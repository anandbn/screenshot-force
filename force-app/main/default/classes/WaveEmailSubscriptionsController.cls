public class WaveEmailSubscriptionsController {
    public class DashboardOrLens{
        @AuraEnabled public String theId {get; set;}
        @AuraEnabled public String theName {get; set;}
        @AuraEnabled public String folderName {get; set;}
        @AuraEnabled public String iconName {get; set;}
        @AuraEnabled public String lastModifiedDate {get; set;}
        public DashboardOrLens(String theId,String dbName,String folderName,String lastModifiedDate,String iconName){
            this.theId=theId;
            this.theName=dbName;
            this.folderName=folderName;
            this.lastModifiedDate=lastModifiedDate;
            this.iconName=iconName;
        }
    }
    @AuraEnabled
    public static void sendEmailDashboardRequest(String dbOrLensName){
        Analytics_Subscribe__e theEvent = new Analytics_Subscribe__e(Dashboard_Name__c=dbOrLensName);
        EventBus.publish(theEvent);
    }
    @AuraEnabled
    public static List<DashboardOrLens> getDashboardAndLensList(){
        List<DashboardOrLens> result = new List<DashboardOrLens>();
        for(EADashboardResponseParser.Dashboards db:WaveUtils.getDashboardList()){
            result.add(new DashboardOrLens(db.id,db.label,db.folder.label,db.lastModifiedDate,'standard:dashboard'));
        }
        for(EALensResponseParser.Lenses lens:WaveUtils.getLensList()){
            result.add(new DashboardOrLens(lens.id,lens.label,lens.folder.label,lens.lastModifiedDate,'utility:chart'));
        }
        return result;
    }    
}