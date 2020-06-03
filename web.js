'use strict';
var express = require('express'),
    oauth2 = require('salesforce-oauth2');
const puppeteer = require('puppeteer');
const Jimp = require('jimp');
const fs = require('fs');
var jsforce = require('jsforce');

require('dotenv').config();

var callbackUrl = process.env.CALLBACK_URL,
    consumerKey = process.env.CONSUMER_KEY,
    consumerSecret = process.env.CONSUMER_SECRET;

var app = express()

if(!fs.existsSync('tmp')){
    fs.mkdirSync('tmp');
}
//app.use(morgan('combined'))



app.get("/", function (request, response) {
    let dashboardName = request.query.name;
    let dashboardId = request.query.id;
    let baseUrl = request.query.loginUrl || 'https://login.salesforce.com';
    if (dashboardName) {
        var uri = oauth2.getAuthorizationUrl({
            redirect_uri: callbackUrl,
            client_id: consumerKey,
            scope: 'web api refresh_token offline_access',
            // You can change loginUrl to connect to sandbox or prerelease env.
            base_url: baseUrl
        });
        let redirectUri = `${uri}&state={"name":"${dashboardName}","id":"${dashboardId}"}`;
        console.log(`Redirecting to ${redirectUri} ..... `);
        return response.redirect(redirectUri);
    } else {
        response.send("<h1>Name parameter is required</h1>");
    }

});

app.get('/oauth/callback', function (request, response) {
    let authorizationCode = request.query.code;
    let relayState = JSON.parse(request.query.state);
    let dashboardName = relayState.name;
    let dashboardId = relayState.id;
    oauth2.authenticate({
        redirect_uri: callbackUrl,
        client_id: consumerKey,
        client_secret: consumerSecret,
        code: authorizationCode,
        // You can change loginUrl to connect to sandbox or prerelease env.
        //base_url: 'https://test.my.salesforce.com'
    }, async function (error, payload) {
        console.log(`Payload received:\n ${JSON.stringify(payload, '\n', 4)}`);
        let userInfo = await getUserInfo(payload);
        getScreenshot(payload, dashboardName,userInfo,dashboardId);
        response.send("<b>Ok</b>");
    });
});

async function getUserInfo(payload){
    var conn = new jsforce.Connection({
        serverUrl: payload.instance_url,
        accessToken: payload.access_token
    });
    return new Promise(function (resolve, reject) {
        conn.identity(function (err, res) {
            if(err){
                reject(err);
            }else{
                resolve(res);
            }
       })
    });
}
async function getScreenshot(payload, dashboardName,userInfo,dashboardId) {
    try {
        const ANALYTICS_SEARCH_BOX_SELECTOR = '#searchInput';
        let browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        const analyticsHome = '/wave/wave.app#dashboard/'+dashboardId;
        let urlToGo = `${payload.instance_url}/secur/frontdoor.jsp?sid=${payload.access_token}&retURL=${analyticsHome}`;
        console.log(`Navigating to URL : ${urlToGo}`);
        await page.goto(urlToGo);
        await page.waitForNavigation();
        console.log(`After waitForNavigation`);

        await page.waitFor(20 * 1000);
        console.log(`After wait for 20 seconds`);
        await page.screenshot({ path: './tmp/salesforce_after_login.png' });
        console.log(`After login screenshot`);
        await page.click(ANALYTICS_SEARCH_BOX_SELECTOR);
        await page.keyboard.type(dashboardName);
        console.log('Looking for Dashboard :' + dashboardName);
        await page.waitFor(20 * 1000);
        await page.screenshot({ path:'./tmp/after_search.png', fullPage: true });

        const allAssets = await page.$$('a.asset-name.slds-truncate')
        const firstDashboardResult = allAssets[0];
        firstDashboardResult.click();
       
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        await page.waitFor(10 * 1000);
        console.log('Found ' + dashboardName);
        await page.setViewport({ width: 1200, height: 1200 });
        await page.waitFor(5 * 1000);

        let fileName = `./tmp/${userInfo.user_id}_${dashboardName}.png`;
        await page.screenshot({ path:fileName , fullPage: true });
        const theImage = await Jimp.read(fileName);
        let imgCrop = await theImage.crop(0, 150, 1200, (1200 - 150));
        console.log(`Cropping header for screenshot to ${fileName}`);
        await imgCrop.write(fileName,async function(){
            console.log(`After cropping image and writing to ${fileName}`);
            await uploadImageAndSendEvent(payload,dashboardName,userInfo,fileName);    
            fs.unlinkSync(fileName);
        })

        browser.close();
    }catch(err){
        console.error(err.message);
    }
   return;

}

async function uploadImageAndSendEvent(payload,dashboardName,userInfo,fileName){
    var conn = new jsforce.Connection({
        serverUrl: payload.instance_url,
        accessToken: payload.access_token
    });
    let bitmap =  fs.readFileSync(fileName);
    let base64Data  = Buffer.from(bitmap).toString('base64');
    var theDoc = {
        Name: dashboardName + '.png',
        FolderId: '00546000000yoxQ',
        Type: 'PNG',
        IsPublic: true,
        Description: dashboardName + '.png',
        Body: base64Data
    };
    let docId = await createSObject(conn,'Document',theDoc);

    console.log(`Created Document with Id ${docId}`);
    await createSObject(conn,'thesaasguy__Send_Email_Dashboard__e',{
        'thesaasguy__Document_Id__c':docId,
        'thesaasguy__Recipient_User_Id__c':userInfo.user_id
    });
}
async function createSObject(sfdcConn, type,sObj){
    let self = this;
    return new Promise(function (resolve, reject) {
        sfdcConn.sobject(type).create(sObj, function (err, ret) {
            if (err) {
                reject(err);
            }
            resolve(ret.id);
        });
    });
}
app.listen(3000, function () {
    console.log("Listening on 3000");
});