'use strict';
const nforce = require('nforce');
const path = require('path');
const puppeteer = require('puppeteer');
const fs = require('fs');
const url = require('url');

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

async function loginToSalesforce(){
    return new Promise(function(resolve,reject){
        org.authenticate({ username: SF_USER_NAME, password: SF_USER_PASSWORD, securityToken: SF_SECURITY_TOKEN }, err => {
            if (err) {
                console.error("Salesforce authentication error");
                console.error(err);
                reject(err);
            } else {
                console.log("Salesforce authentication successful");
                console.log(org.oauth.instance_url + '/secur/frontdoor.jsp?sid='+org.oauth.access_token+'&retURL=/analytics/wave/wave.apexp#home');
                resolve();
            }
        });
    })
    
}

async function testLoginViaPupeteer(){

    await loginToSalesforce();
    if (!fs.existsSync('_tmp')) {
        fs.mkdir('_tmp');
        console.log('created _tmp directory for screenshots');
    }
    
    var browserArgs = ['--no-sandbox', '--disable-setuid-sandbox'];
    console.log('Headless Browser Arguments:'+ browserArgs);
    const browser = await puppeteer.launch({
        headless: true,
        args: browserArgs
    });
    const page = await browser.newPage();
    const USERNAME_SELECTOR = '#username';
    const PASSWORD_SELECTOR = '#password';
    const BUTTON_SELECTOR = '#Login';

 
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
    await page.screenshot({ path: path.join('_tmp', 'salesforce_after_login.png'), fullPage: true });

    browser.close();
    
}

testLoginViaPupeteer();