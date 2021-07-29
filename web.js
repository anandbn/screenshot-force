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

if (!fs.existsSync('tmp')) {
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
        let redirectUri = `${uri}&state={"type":"Dashboard","name":"${dashboardName}","id":"${dashboardId}"}`;
        console.log(`Redirecting to ${redirectUri} ..... `);
        return response.redirect(redirectUri);
    } else {
        response.send("<h1>Name parameter is required</h1>");
    }

});


app.get("/account", function (request, response) {
    let accountId = request.query.id;
    let accountName = request.query.name;
    let baseUrl = request.query.loginUrl || 'https://login.salesforce.com';
    var uri = oauth2.getAuthorizationUrl({
        redirect_uri: callbackUrl,
        client_id: consumerKey,
        scope: 'web api refresh_token offline_access',
        // You can change loginUrl to connect to sandbox or prerelease env.
        base_url: baseUrl
    });
    let redirectUri = `${uri}&state={"type":"Account","name":"${accountName}","Id":"${accountId}"}`;
    console.log(`Redirecting to ${redirectUri} ..... `);
    return response.redirect(redirectUri);
});


app.get("/filterByRep", function (request, response) {
    let accountId = request.query.id;
    let accountName = request.query.name;
    let baseUrl = request.query.loginUrl || 'https://login.salesforce.com';
    var uri = oauth2.getAuthorizationUrl({
        redirect_uri: callbackUrl,
        client_id: consumerKey,
        scope: 'web api refresh_token offline_access',
        // You can change loginUrl to connect to sandbox or prerelease env.
        base_url: baseUrl
    });
    let redirectUri = `${uri}&state={"type":"FilterByRep","repNames":"${request.query.repNames}"}`;
    console.log(`Redirecting to ${redirectUri} ..... `);
    return response.redirect(redirectUri);
});

app.get('/oauth/callback', function (request, response) {
    let authorizationCode = request.query.code;
    let relayState = JSON.parse(request.query.state);
    
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
        if(relayState.type === "Account"){
            getScreenshotFilteredByAccount(payload, relayState.name, userInfo, relayState.Id);

        }else if(relayState.type === "Dashboard"){
            let dashboardName = relayState.name;
            let dashboardId = relayState.id;
            getScreenshot(payload, dashboardName, userInfo, dashboardId);
        }else if(relayState.type === "FilterByRep"){
            let repNames = relayState.repNames;
            getScreenshotForReps(payload, userInfo, repNames);
        }
        response.send("<b>Ok</b>");
    });
});

async function getUserInfo(payload) {
    var conn = new jsforce.Connection({
        serverUrl: payload.instance_url,
        accessToken: payload.access_token
    });
    return new Promise(function (resolve, reject) {
        conn.identity(function (err, res) {
            if (err) {
                reject(err);
            } else {
                resolve(res);
            }
        })
    });
}

async function getScreenshot(payload, dashboardName, userInfo, dashboardId) {
    await logAndSendEvent(dashboardName,payload, `Screenshot processing started`,'Start');

    try {
        const OPEN_IN_ANALYTICS = 'div.action.open-in-wave-btn';
        let browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        const analyticsHome = '/wave/wave.app#dashboard/'+dashboardId;
        
        let urlToGo = `${payload.instance_url}/secur/frontdoor.jsp?sid=${payload.access_token}&retURL=${encodeURIComponent(analyticsHome)}`;
        await logAndSendEvent(dashboardName,payload, `Navigating to URL : ${urlToGo}`);
        await page.goto(urlToGo);
        await page.waitForNavigation();
        await logAndSendEvent(dashboardName,payload, `After waitForNavigation`);

        await page.waitFor(30 * 1000);
        await logAndSendEvent(dashboardName,payload, `After waiting for 30 secs`);
        
        await page.setViewport({ width: 1200, height: 1200 });
        await page.waitFor(5 * 1000);

        let fileName = `./tmp/${userInfo.user_id}_${dashboardName}.png`;
        await page.screenshot({ path:fileName , fullPage: true });
        const theImage = await Jimp.read(fileName);
        let imgCrop = await theImage.crop(0, 150, 1200, (1200 - 150));
        await logAndSendEvent(dashboardName,payload, `Cropping header for screenshot to ${fileName}`);
        await imgCrop.write(fileName,async function(){
            await logAndSendEvent(dashboardName,payload, `After cropping image and writing to ${fileName}`);
            await uploadImageAndSendEvent(payload,dashboardName,userInfo,fileName);    
            fs.unlinkSync(fileName);
        });
        await logAndSendEvent(dashboardName,payload, `Screenshot processing started`,'End');

    } catch (err) {
        console.error(err.message);
        browser.close();
        await logAndSendEvent(dashboardName,payload, err.message,'Error');
    }
    return;

}
async function getScreenshotFilteredByAccount(payload, accountName,userInfo, accountId) {
    await logAndSendEvent(accountName,payload, `Screenshot processing started`,'Start');

    try {
        let browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        const accountUrl = `/lightning/r/Account/${accountId}/view`;

        let urlToGo = `${payload.instance_url}/secur/frontdoor.jsp?sid=${payload.access_token}&retURL=${encodeURIComponent(accountUrl)}`;
        await logAndSendEvent(accountName,payload, `Navigating to URL : ${urlToGo}`);
        await page.goto(urlToGo);
        await page.waitForNavigation();
        await logAndSendEvent(accountName,payload, `After waitForNavigation`);

        await page.waitFor(20 * 1000);
       
        await logAndSendEvent(accountName,payload, `Found ${accountId}`);
        await page.screenshot({ path: `./tmp/homePage_${accountId}.png`, fullPage: true });

        await page.setViewport({ width: 1200, height: 1200 });
        await page.waitFor(5 * 1000);

        for (const frame of page.mainFrame().childFrames()) {
            if (frame.url().includes('wave.app')) {
                await logAndSendEvent(accountName,payload, 'Found wave Frame.....');
                const openInWaveBtns = await frame.$$('div.action.open-in-wave-btn')
                const openInWaveBtn = openInWaveBtns[0];
                openInWaveBtn.click();
                await logAndSendEvent(accountName,payload, 'Clicking into filtered Dashboard...waiting for 30 seconds');
                await page.waitFor(30 * 1000);
                // get all the currently open pages as an array
                let pages = await browser.pages();
                console.log(`2: pages.length = ${pages.length}`);
                for (const thePage of pages) {
                    console.log(`2:page.url = ${thePage.url()}`);
                    if (thePage.url().includes('wave.app')) {
                        await logAndSendEvent(accountName,payload, 'Found wave browser tab');
                        console.log('2:set viewport to 1200 x 1200..waiting for 10 secs...');
                        await thePage.setViewport({ width: 1200, height: 1200 });
                        await thePage.waitFor(10 * 1000);
                        let fileName = `./tmp/filtered_db_${accountId}.png`;
                        await thePage.screenshot({ path: fileName, fullPage: true });
                        await logAndSendEvent(accountName,payload, 'Done screenshotting...');
                        const theImage = await Jimp.read(fileName);
                        let imgCrop = await theImage.crop(0, 150, 1200, (1200 - 150));
                        await logAndSendEvent(accountName,payload, `Cropping header for screenshot to ${fileName}`);
                        await imgCrop.write(fileName, async function () {
                            await logAndSendEvent(accountName,payload, `After cropping image and writing to ${fileName}`);
                            await uploadImageAndSendEvent(payload, accountName, userInfo, fileName);
                            fs.unlinkSync(fileName);
                        })
                    }
                }
            }
        }
        browser.close();
        await logAndSendEvent(accountName,payload, `Screenshot processing ended`,'End');

    } catch (err) {
        console.error(err.message);
        browser.close();
        await logAndSendEvent(accountName,payload,err.message,'Error');

    }
    return;

}

async function getScreenshotForReps(payload, userInfo, repNames) {
    var repNameArray = Array.from(repNames.split(','));
    for(var i=0;i<repNameArray.length;i++){
        await logAndSendEvent(repNameArray[i],payload, `Starting screenshot for ${repNameArray[i]}`,'Start');
        await filteredDashboardByRep(payload, userInfo, repNameArray[i]);
        await logAndSendEvent(repNameArray[i],payload, `Starting screenshot for ${repNameArray[i]}`,'End');
    }
}
async function filteredDashboardByRep(payload, userInfo, repName){
    try{
        let browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        
        const filteredDashboardPage = `/lightning/n/thesaasguy__Filtered_Dashboards#salesRep=${repName}`;
        let urlToGo = `https://anandwavedev-dev-ed.my.salesforce.com/secur/frontdoor.jsp?sid=${payload.access_token}&retURL=${encodeURIComponent(filteredDashboardPage)}`; 
        await logAndSendEvent(repName, payload, `Navigating to URL : ${urlToGo}`);
        await page.setViewport({ width: 1200, height: 1200 });
        await page.goto(urlToGo);
    
        await page.waitForNavigation();
        console.log(`After waitForNavigation`);
        await page.waitFor(20 * 1000);
        
        
        
        await logAndSendEvent(repName, payload, `After navigating to filtered dashboardboard`);
        await page.screenshot({ path: `./tmp/homePage.png`, fullPage: true });
        await logAndSendEvent(repName, payload, `After screenshot of homepage`);
    
        for (const frame of page.mainFrame().childFrames()) {
            if (frame.url().includes('analytics/dashboard')) {
                await logAndSendEvent(repName, payload, 'Found wave Frame.....');
                const openInWaveBtns = await frame.$x('//button[@class="slds-button slds-button_icon-border action-bar-action-openInNewWindow reportAction report-action-openInNewWindow"]');
                const openInWaveBtn = openInWaveBtns[0];
                openInWaveBtn.click();
                await logAndSendEvent(repName, payload, 'Clicking into filtered Dashboard...waiting for 30 seconds');
                await page.waitFor(30 * 1000);
                // get all the currently open pages as an array
                let pages = await browser.pages();
                console.log(`2: pages.length = ${pages.length}`);
                for (const thePage of pages) {
                    console.log(`2:page.url = ${thePage.url()}`);
                    if (thePage.url().includes('analytics/dashboard')) {
                        await logAndSendEvent(repName, payload, 'Found wave browser tab');
                        await logAndSendEvent(repName, payload, 'set viewport to 1200 x 1200..waiting for 10 secs...');
                        await thePage.setViewport({ width: 1200, height: 1200 });
                        await thePage.waitFor(10 * 1000);
                        let currentTime = new Date().toISOString().replace('.','_').replace(':','_');
                        let fileName = `./tmp/filtered_db_${repName}_${currentTime}.png`;
                        await thePage.screenshot({ path: fileName, fullPage: true });
                        await logAndSendEvent(repName, payload, `Done screenshotting to file : ${fileName}`);
                        const theImage = await Jimp.read(fileName);
                        let imgCrop = await theImage.crop(0, 150, 1200, (1200 - 150));
                        await logAndSendEvent(repName, payload, `Cropping header for screenshot to ${fileName}`);
                        await imgCrop.write(fileName, async function () {
                            console.log(payload, `After cropping image and writing to ${fileName}`);
                            await uploadImageAndSendEvent(payload, repName, userInfo, fileName);
                            fs.unlinkSync(fileName);
                        })
                    }
                }
            }
        }
        browser.close();
    }catch(error){
        console.error(error.message);
        browser.close();

    }
    
}
async function uploadImageAndSendEvent(payload, dashboardName, userInfo, fileName) {
    var conn = new jsforce.Connection({
        serverUrl: payload.instance_url,
        accessToken: payload.access_token
    });
    let bitmap = fs.readFileSync(fileName);
    let base64Data = Buffer.from(bitmap).toString('base64');
    var theDoc = {
        Name: fileName + '.png',
        FolderId: '00546000000yoxQ',
        Type: 'PNG',
        IsPublic: true,
        Description: fileName + '.png',
        Body: base64Data
    };
    let docId = await createSObject(conn, 'Document', theDoc);
    await logAndSendEvent(dashboardName,payload, `Uploaded image to Document - Id ${docId}`);
    await createSObject(conn, 'thesaasguy__Send_Email_Dashboard__e', {
        'thesaasguy__Document_Id__c': docId,
        'thesaasguy__Recipient_User_Id__c': userInfo.user_id
    });
    await logAndSendEvent(dashboardName,payload, `Screenshot processing Ended`,'End');

}
async function createSObject(sfdcConn, type, sObj) {
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

async function logAndSendEvent(groupName,payload,msg,status){
    var conn = new jsforce.Connection({
        serverUrl: payload.instance_url,
        accessToken: payload.access_token
    });
    console.log(msg);
    await createSObject(conn, 'thesaasguy__Message__e', {
        'thesaasguy__Group__c':groupName,
        'thesaasguy__Log_Message__c': msg,
        'thesaasguy__Status__c':status
    });

}
app.listen(3000, function () {
    console.log("Listening on 3000");
});