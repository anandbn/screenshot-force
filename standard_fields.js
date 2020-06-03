'use strict';
require('dotenv').load();
const puppeteer = require('puppeteer');
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

async function run() {
    const browser = await initializeBrowser();
    let allFieldsAndObjects = new Array();
    /*for (let k = 0; k < ALL_OBJECTS.length; k++) {
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
    let res = await getStandardFields(browser, 'Opportunity');
    browser.close();
}

run();


