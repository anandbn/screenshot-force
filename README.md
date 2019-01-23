### Prerequisites

- NodeJS
- NPM
- Pupeteer Buildpack

### Building 

Download git repo and follow the below commands

```
npm install

```

### Add the pupeteer build pack

Add the pupeteer build pack to the NodeJS build pack so that pupeteer gets bundled with the slug that gets built.

```
heroku buildpacks:add https://github.com/jontewks/puppeteer-heroku-buildpack
```

### Heroku Environment variables

Create a Connected app with OAuth enabled and plug in the below config variables.

```
SF_CLIENT_ID:      
SF_CLIENT_SECRET:  
SF_ENDPOINT_URL:   https://login.salesforce.com
```
Currently this app runs using 1 user that you configure with the below config variables

```
SF_SECURITY_TOKEN: 
SF_USER_NAME:      
SF_USER_PASSWORD:  
```

### Platform event to request an emailed screenshot

Currently uses two platform events:
1. `Analytics_Subscribe__e` : Used to listen for a request to kick off the process of screeshot for a specific dashboard.
2. `Send_Email_Dashboard__e` : Used to notify the platform that the screnshot process is complete and has been uploaded into the `Documents` in salesforce. There is a trigger that will trigger the email to the end user that oroginally requested the email. Below you'll see a sample of that trigger on the platform event.

```
trigger EmailSubscriptionDashboardTrigger on Send_Email_Dashboard__e (after insert) {
    Send_Email_Dashboard__e theEvent = Trigger.new[0];
    System.debug('>>>>>>> Trigger.new :'+Trigger.new[0]);
    SendSubscriptionEmail.sendEmail(theEvent.Document_Id__c);
}

```

__SendSubscriptionEmail.cls__

```
public class SendSubscriptionEmail {
    private static String templateId='<setup an email template>';
    public static void sendEmail(String docId){
        Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage();
        mail.setOrgWideEmailAddressId('<your org wide default email>');
        mail.setTemplateId(templateId);
        mail.optOutPolicy = 'FILTER';
        mail.setWhatId(docId);
        mail.setSaveAsActivity(false);
        User usr = [select Id from User where Id=<user you want to send this email to>];
        mail.setTargetObjectId(usr.Id);
        Messaging.SendEmailResult[] results =  Messaging.sendEmail(new Messaging.Email[] { mail } , true);
        if (results[0].success) {
            System.debug('The email was sent successfully.');
        } else {
            System.debug('The email failed to send: ' + results[0].errors[0].message);
        } 
    }
    
    
}

```

Make sure you update that part of the code 
### Running 

Once build is complete, run the following command to get a screenshot of the wave dashboard

```
node app.js

```

