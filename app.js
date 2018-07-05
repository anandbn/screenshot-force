'use strict';
const puppeteer = require('puppeteer');
const faye = require('faye');
const nforce = require('nforce');
const Jimp = require('jimp');
const opn = require('opn');
const fs = require('fs');
const path = require('path');
const express = require('express');
let app = express();
let server = require('http').Server(app);
let PORT = process.env.PORT || 3000;

let bayeux = new faye.NodeAdapter({ mount: '/faye', timeout: 45 });
bayeux.attach(server);
bayeux.on('disconnect', function (clientId) {
    console.log('Bayeux server disconnect');
});

server.listen(PORT, () => console.log(`Express server listening on ${PORT}`));

// Connect to Salesforce
let SF_CLIENT_ID = process.env.SF_CLIENT_ID;
let SF_CLIENT_SECRET = process.env.SF_CLIENT_SECRET;
let SF_USER_NAME = process.env.SF_USER_NAME;
let SF_USER_PASSWORD = process.env.SF_USER_PASSWORD;
let SF_SECURITY_TOKEN = process.env.SF_SECURITY_TOKEN;
let SF_ENDPOINT_URL = process.env.SF_ENDPOINT_URL;

console.log('SF_CLIENT_ID:' + SF_CLIENT_ID);
console.log('SF_CLIENT_SECRET:' + SF_CLIENT_SECRET);
console.log('SF_USER_NAME:' + SF_USER_NAME);
console.log('SF_USER_PASSWORD:' + SF_USER_PASSWORD);
console.log('SF_SECURITY_TOKEN:' + SF_SECURITY_TOKEN);


let org = nforce.createConnection({
    clientId: SF_CLIENT_ID,
    clientSecret: SF_CLIENT_SECRET,
    environment: "production",
    redirectUri: 'http://localhost:3000/oauth/_callback',
    mode: 'single',
    autoRefresh: true
});

org.authenticate({ username: SF_USER_NAME, password: SF_USER_PASSWORD, securityToken: SF_SECURITY_TOKEN }, err => {
    if (err) {
        console.error("Salesforce authentication error");
        console.error(err);
    } else {
        console.log("Salesforce authentication successful");
        console.log(org.oauth.instance_url);
        subscribeToPlatformEvents();
    }
});

// Subscribe to Platform Events
let subscribeToPlatformEvents = () => {
    var client = new faye.Client(org.oauth.instance_url + '/cometd/40.0/');
    client.setHeader('Authorization', 'OAuth ' + org.oauth.access_token);
    client.subscribe('/event/thesaasguy__Analytics_Subscribe__e', function (message) {
        console.log('Platform event Analytics_Subscribe__e received ....' + JSON.stringify(message));
        getScreenshot(message);
    });

};


async function getScreenshot(subscribeEvent) {
    let dashboardName = subscribeEvent.payload.thesaasguy__Dashboard_Name__c;

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    const USERNAME_SELECTOR = '#username';
    const PASSWORD_SELECTOR = '#password';
    const BUTTON_SELECTOR = '#Login';
    const ANALYTICS_SEARCH_BOX_SELECTOR = '.lensearch';

    await page.goto(SF_ENDPOINT_URL + '?startURL=/analytics/wave/wave.apexp#home');
    await page.click(USERNAME_SELECTOR);
    await page.keyboard.type(SF_USER_NAME);

    await page.click(PASSWORD_SELECTOR);
    await page.keyboard.type(SF_USER_PASSWORD);

    await page.click(BUTTON_SELECTOR);
    console.log('Login button clicked');
    await page.waitForNavigation();
    console.log('after navigation complete');
    await page.waitFor(6 * 1000);
    console.log('after waiting for 5 seconds');
    await page.screenshot({ path:'/tmp/salesforce_after_login.png', fullPage: true });


    await page.click(ANALYTICS_SEARCH_BOX_SELECTOR);
    await page.keyboard.type(dashboardName);
    console.log('Looking for Dashboard :' + dashboardName);
    await page.waitFor(5 * 1000);
    await page.screenshot({ path:'/tmp/after_search.png', fullPage: true });
    await page.click('[data-tooltip="' + dashboardName + '"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    console.log('Found ' + dashboardName);
    await page.setViewport({ width: 1200, height: 1200 });
    await page.waitFor(5 * 1000);

    await page.screenshot({ path: '/tmp/temp.png', fullPage: true });
    console.log('>>>'+ '/tmp/temp.png written ...');
    Jimp.read('/tmp/temp.png')
        .then(function (theImage) {
            console.log('Cropping header for screenshot.. ');
            theImage.crop(0, 150, 1200, (1200 - 150))
                .write('/tmp/temp.png');
            var theDoc = nforce.createSObject('Document', {
                Name: dashboardName + '.png',
                FolderId: '00546000000yoxQ',
                Type: 'PNG',
                IsPublic: true,
                Description: dashboardName + '.png',
                attachment: {
                    fileName: dashboardName + '.png',
                    body: fs.readFileSync('/tmp/temp.png')
                }
            });
            org.insert({ sobject: theDoc })
                .then(function(){
                    console.log('Document created successfully :' + theDoc._fields.id);
                })
                .error(function (err) {
                    console.error('Document creation failed !!!!');
                    console.error(err);
                });
            fs.unlinkSync(path.join('/tmp', 'temp.png'));
        });
    browser.close();
}



