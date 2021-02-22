'use strict';
require('dotenv').load();
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const ALL_OBJECTS = [
    'Account',
    'AccountTeamMember',
    'Asset',
    'Attachment',
    'Campaign',
    'CampaignMember',
    'Case',
    'CaseComment',
    'Contact',
    'Contract',
    'Entitlement',
    'Event',
    'Individual',
    'Lead',
    'Opportunity',
    'OpportunityLineItem',
    'OpportunityTeamMember',
    'Order',
    'OrderItem',
    'Pricebook2',
    'PricebookEntry',
    'Product2',
    'ProductItem',
    'Quote',
    'Task',
    'User',
];

async function initializeBrowser() {
    let browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    return browser;
}

async function getStandardFields(browser, objName) {


    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    await page.goto('https://developer.salesforce.com/docs/atlas.en-us.api.meta/api/sforce_api_objects_' + objName.toLowerCase() + '.htm');
    await page.waitFor(5 * 1000);
    console.log('after waiting for 5 seconds');

    let fieldNames = await page.evaluate(
        () => {
            const newArray = new Array();

            const tBodyList = document.querySelectorAll('table.featureTable.sort_table > tbody');
            const tBodyRowArray = Array.from(tBodyList);
            const rowNodeList = tBodyRowArray[0].childNodes;

            const rowArray = Array.from(rowNodeList);
            for (var i = 0; i < rowArray.length; i++) {
                let theRow = rowArray[i];
                let fieldName, fieldType;
                for (var childNode of theRow.childNodes) {
                    try {
                        console.log(`0 : ${childNode.nodeName} ${childNode.nodeType}`);
                        if (childNode.nodeType != Node.TEXT_NODE) {
                            console.log(`1 : ${childNode.nodeName} data-title = ${childNode.getAttribute('data-title')}`);
                            if (childNode.nodeName === "TD" && childNode.getAttribute('data-title').startsWith('Details')) {
                                console.log(`${fieldName} - TD Detail`);
                                if (fieldName) {
                                    console.log(`${fieldName} - T1 ${childNode.childNodes.length}`);
                                    for (var tdChildNode of childNode.childNodes) {
                                        if (tdChildNode.nodeName === "DL") {
                                            console.log(`${fieldName} - T2 ${tdChildNode.childNodes.length}`);

                                            for (var dtddNode of tdChildNode.childNodes) {
                                                if (dtddNode.nodeName === "DT") {
                                                    console.log(`${fieldName} - T3 ${dtddNode.childNodes.item(0).nodeValue}`);
                                                    attrName = dtddNode.childNodes.item(0).nodeValue;
                                                } else if (dtddNode.nodeName === "DD") {
                                                    if (attrName === "Type") {
                                                        console.log(`${fieldName} - T4 ${dtddNode.childNodes.item(0).nodeValue}`);
                                                        fldType = dtddNode.childNodes.item(0).nodeValue;
                                                        if (fieldName.indexOf('|') > 0) {
                                                            for (var fldName of fieldName.split("|")) {
                                                                console.log(`T5 fldName: ${fldName}, type: ${fldType}`);
                                                                newArray.push({ "fieldName": fldName, "type": fldType });
                                                            }
                                                        } else {
                                                            newArray.push({ "fieldName": fieldName, "type": fldType });

                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                } else {
                                    console.log('field name null');
                                }
                            }
                            if (childNode.nodeName === "TD" && childNode.getAttribute('data-title').startsWith('Field')) {
                                //console.log(`2 : ${childNode.childNodes.length} ${childNode.childNodes.item(0).nodeType}`);
                                if (childNode.childNodes.length == 1) {
                                    //console.log(`LEN1: ${childNode.childNodes.item(0).nodeType} ${childNode.childNodes.item(0).nodeName}`);

                                    fieldName = childNode.childNodes.item(0).childNodes.item(0).nodeValue;
                                }

                                if (childNode.childNodes.length == 3) {
                                    //console.log(`LEN3 : ${childNode.childNodes.item(1).nodeName} ${childNode.childNodes.item(1).nodeType}`);
                                    if (childNode.childNodes.item(1).nodeName === "SPAN") {
                                        if (childNode.childNodes.item(1).childNodes.length == 2) {
                                            fieldName = childNode.childNodes.item(1).childNodes.item(1).nodeValue;
                                        }
                                        if (childNode.childNodes.item(1).childNodes.length == 1) {
                                            fieldName = childNode.childNodes.item(1).childNodes.item(0).nodeValue;
                                        }
                                    } else if (childNode.childNodes.item(1).nodeName === "UL") {
                                        //Multiple fields in the same TD
                                        //Get <li>
                                        //Get <span>
                                        //Get text within span
                                        let ulNode = childNode.childNodes.item(1);
                                        let fldList = new Array();
                                        for (var liNode of ulNode.childNodes) {
                                            if (liNode.nodeName === "LI") {
                                                //console.log(`LEN3 : <ul><li> ${liNode.childNodes.length}`);
                                                if (liNode.childNodes.length == 3) {
                                                    fldList.push(liNode.childNodes.item(1).childNodes.item(0).nodeValue);
                                                }
                                                if (liNode.childNodes.length == 1) {
                                                    //console.log(`LEN3-3 : <ul><li> ${liNode.childNodes.item(0).nodeName}`);
                                                    fldList.push(liNode.childNodes.item(0).childNodes.item(0).nodeValue);
                                                }
                                            }
                                        }
                                        fieldName = fldList.join('|');
                                    }
                                }

                                if (!fieldName) {
                                    fieldName = childNode.childNodes.item(0).getAttribute('id');
                                }
                                if (fieldName) {
                                    console.log(`F : ${fieldName}`)
                                }
                            }

                        }
                    } catch (err) {
                        console.log(`message ${err.message}, LineNumber ${err.lineNumber}`);
                    }
                }
            }
            return newArray;
        }
    );
    return fieldNames;
}

async function filteredDashboard(browser,repName){
    const page = await browser.newPage();

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    
    const filteredDashboardPage = `/lightning/n/thesaasguy__Filtered_Dashboards#salesRep=${repName}`;
    let urlToGo = `https://anandwavedev-dev-ed.my.salesforce.com/secur/frontdoor.jsp?sid=00D46000000qFQG!ARMAQJhqPrbcfgJmieJUCMDJsMfL.ZBFQ3xdamccMBihaX5aKFs2E423fd4d4Q1QAiuPhhioQ4NoewHlMqCbZ33.I3PkmGt5&retURL=${encodeURIComponent(filteredDashboardPage)}`; 
    console.log(`Navigating to URL : ${urlToGo}`);
    await page.setViewport({ width: 1200, height: 1200 });
    await page.goto(urlToGo);

    await page.waitForNavigation();
    console.log(`After waitForNavigation`);
    await page.waitFor(20 * 1000);
    
    
    console.log(`After navigating to filtered dashboardboard`);
    await page.screenshot({ path: `./tmp/homePage.png`, fullPage: true });
    console.log(`After screenshot of homepage`);

    for (const frame of page.mainFrame().childFrames()) {
        if (frame.url().includes('wave.app')) {
            console.log('Found wave Frame.....');
            const openInWaveBtns = await frame.$$('div.action.open-in-wave-btn')
            const openInWaveBtn = openInWaveBtns[0];
            openInWaveBtn.click();
            console.log('Clicking into filtered Dashboard...waiting for 30 seconds');
            await page.waitFor(30 * 1000);
            // get all the currently open pages as an array
            let pages = await browser.pages();
            console.log(`2: pages.length = ${pages.length}`);
            for (const thePage of pages) {
                console.log(`2:page.url = ${thePage.url()}`);
                if (thePage.url().includes('wave.app')) {
                    console.log('2:Found wave browser tab');
                    console.log('2:set viewport to 1200 x 1200..waiting for 10 secs...');
                    await thePage.setViewport({ width: 1200, height: 1200 });
                    await thePage.waitFor(10 * 1000);
                    let fileName = `./tmp/filtered_db_${repName}.png`;
                    await thePage.screenshot({ path: fileName, fullPage: true });
                    console.log('2:Done screenshotting...');
                    const theImage = await Jimp.read(fileName);
                    let imgCrop = await theImage.crop(0, 150, 1200, (1200 - 150));
                    console.log(`Cropping header for screenshot to ${fileName}`);
                    await imgCrop.write(fileName, async function () {
                        console.log(`After cropping image and writing to ${fileName}`);
                        await uploadImageAndSendEvent(payload, accountName, userInfo, fileName);
                        fs.unlinkSync(fileName);
                    })
                }
            }
        }
    }
    browser.close();
}

async function waitForCustomElement(page){
    console.log('inside waitForCustomElement');
        
    await page.evaluate(
        async () => {
            console.log('inside evaluate');
            const elemList = document.querySelector("#brandBand_1 > div > div.center.oneCenterStage.lafSinglePaneWindowManager > div > div > div > div > div > div > div.grouping.grouping2 > div.column.column2 > div > thesaasguy-filter-my-dashboard > input");
            //const asArrayList = Array.from(elemList);
            console.log(elemList).length;
            console.log('2:inside evaluate');
        }
    );
}
async function run() {
    const browser = await initializeBrowser();
    /*let allFieldsAndObjects = new Array();
    for (let k = 0; k < ALL_OBJECTS.length; k++) {
        console.log(`Processing Object ${ALL_OBJECTS[k]} ...`);
        let theFields = await getStandardFields(browser, ALL_OBJECTS[k]);
        allFieldsAndObjects.push({
            "object": ALL_OBJECTS[k],
            "standardFields": theFields
        });
        console.log(`Completed processing Object ${ALL_OBJECTS[k]}, Total Fields: ${theFields.length}`);

    }
    console.log(JSON.stringify(allFieldsAndObjects, '\n', 4));
    */
    //let res = await getStandardFields(browser, 'Opportunity');
    await filteredDashboard(browser);
    browser.close();
}

run();


