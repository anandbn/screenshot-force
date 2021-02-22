trigger EmailSubscriptionDashboardTrigger on thesaasguy__Send_Email_Dashboard__e (after insert) {
    Send_Email_Dashboard__e theEvent = Trigger.new[0];
    System.debug('>>>>>>> Trigger.new :'+Trigger.new[0]);
    SendSubscriptionEmail.sendEmail(theEvent.thesaasguy__Document_Id__c, theEvent.thesaasguy__Recipient_User_Id__c);
}