@IsTest
public with sharing class SendSubscriptionEmailTest {
    
    @IsTest
    static void testSendEmail() {
        Document theDoc = new Document(Name='Test.png',
            FolderId= '00546000000yoxQ',
            Type='PNG',
            IsPublic=true,
            Description= 'Test.png',
            Body=Blob.valueOf('Blah')
        );
        insert theDoc;
        
        Test.startTest();
        Boolean sendSts = SendSubscriptionEmail.sendEmail(theDoc.Id, UserInfo.getUserId());
        Test.stopTest();
        System.assertEquals(true,sendSts);
    }
}