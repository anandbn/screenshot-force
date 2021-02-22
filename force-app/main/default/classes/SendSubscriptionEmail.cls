public class SendSubscriptionEmail {
    private static String templateId='00X46000000YnB9';
    public static Boolean sendEmail(String docId,String recipientUserId){
        Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage();
        mail.setOrgWideEmailAddressId('0D246000000XZpzCAG');
        mail.setTemplateId(templateId);
        mail.optOutPolicy = 'FILTER';
        mail.setWhatId(docId);
        mail.setSaveAsActivity(false);
        mail.setTargetObjectId(recipientUserId);
        Messaging.SendEmailResult[] results =  Messaging.sendEmail(new Messaging.Email[] { mail } , true);
        return results[0].isSuccess();
    }
    
    
}