'use strict';
const puppeteer = require('puppeteer');
const Jimp = require('jimp');
const opn = require('opn');
const fs = require('fs');

async function run() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const USERNAME_SELECTOR = '#username';
    const PASSWORD_SELECTOR = '#password';
    const BUTTON_SELECTOR = '#Login';
    const APP_ICON_SELECTOR = '#oneHeader > div.bBottom > div > div.slds-context-bar__primary.navLeft > div.slds-context-bar__item.slds-context-bar_dropdown-trigger.slds-dropdown-trigger.slds-dropdown-trigger--click.slds-no-hover > nav > button';
    const ALL_APPS_SELECTOR = "ul#sortable";
    await page.goto(process.argv[2]+'?startURL=/analytics/wave/wave.apexp#home');
    await page.click(USERNAME_SELECTOR);
    await page.keyboard.type(process.argv[3]);

    await page.click(PASSWORD_SELECTOR);
    await page.keyboard.type(process.argv[4]);

    await page.click(BUTTON_SELECTOR);
    console.log('Login button clicked');
    await page.waitForNavigation();
    console.log('after navigation complete');
    await page.waitFor(6 * 1000);
    console.log('after waiting for 5 seconds');
    await page.screenshot({ path: 'screenshots/salesforce_after_login.png' , fullPage: true});

    var dashboardName = process.argv[5];
    console.log('Looking for Dashboard :'+dashboardName);
    await page.click('[data-tooltip="'+dashboardName+'"]');
    await page.waitForNavigation({waitUntil: 'networkidle2'});
    console.log('after '+dashboardName);
    await page.setViewport({width: 1200, height: 1200});
    await page.waitFor(5 * 1000);

    await page.screenshot({ path: 'screenshots/temp.png' , fullPage: true});
    Jimp.read('screenshots/temp.png').then(function(theImage){
        theImage.crop(0,150,1200,(1200-150))
                .write("screenshots/"+dashboardName+".png");
    });
    await page.waitFor(2 * 1000);
    fs.unlinkSync('screenshots/temp.png');
    browser.close();
    opn("screenshots/"+dashboardName+".png",{wait:false});
}


if(process.argv.length == 2){
    console.error('Parameters: <login url> <username> <password> <dashboard name>');
    process.exit(-1);
}else{
    run();
}