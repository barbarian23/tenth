import socketServer from "../../service/socket/socket.server.service";
import csvService from "../../service/csv/csv.server.service";
import {
    SOCKET_LOGIN,
    SOCKET_OTP,
    SOCKET_GET_LIST_PHONE,
    SOCKET_LIST_PHONE,
    SOCKET_WORKING_SINGLE_NUMBER,
    SOCKET_WORKING_SOME_NUMBER,
    SOCKET_WORKING_ADDED_NUMBER,
    SOCKET_WORKING_ADDED_SOME_NUMBER,
    SOCKET_WORKING_DELETE_PHONE,
    SOCKET_WORKING_DELETED_PHONE,
    SOCKET_WORKING_EDITED_PHONE,
    SOCKET_WORKING_EDIT_PHONE,
    SOCKET_SETINTERVAL_PHONE,
    SOCKET_SETINTERVALED_PHONE,
    SOCKET_LOG,
    SOCKET_INTERVAL_ALL_PHONE_URL,
    SOCKET_INTERVAL_EACH_PHONE_URL,
    SOCKET_SET_WAIT_TIME
} from "../../../common/constants/common.constants";
import doLogin from "../work/login.controller";
import doOTPChecking from "../work/otp.controller";
import receive from "../reactjs/render.controller"; // render client

import { URL_1, URL_2 } from "../../constants/work/work.constants";
import { verifyNumberPhone } from "../../service/util/utils.server";
import { isBuffer } from "lodash";

const puppeteer = require('puppeteer');
//C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe
//C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe
let exPath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
var driver;
var urlID = 1;

var WAIT_TIME = 8000;
var socket = null;

// const seleniumInsstance = new seleniumCrawl();
const csvInstance = new csvService();

var countInterval = 0, mainInterval = null;

let arrayNumber = [];
try {
    arrayNumber = csvInstance.readFile();
    arrayNumber.forEach((item,index) => {
        if(item){
            if(item.money){
                item.money = item.money.replace(/\./g,"");
            }
            if(item.info){
                item.info = item.money.replace(/\./g,"");
            }
        }
    });
} catch (e) {
    console.error("loi doc file csv", e);
}

function timer(ms) {
    return new Promise(res => setTimeout(res, ms));
}

const preparePuppteer = function () {
    return new Promise((res, rej) => {
        puppeteer.launch({
            args: ["--no-sandbox", "--proxy-server='direct://'", '--proxy-bypass-list=*'],
            headless: false,
            ignoreHTTPSErrors: true,
            executablePath: exPath == "" ? "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe" : exPath
        })
            .then(async (browser) => {
                let pageLogin = await browser.newPage();
                pageLogin.setViewport({ width: 2600, height: 3800 });

                res(pageLogin);
            }).catch(e => {
                rej(e);
            });

    });
}

const workingController = async function (server, app) {
    try {
        driver = await preparePuppteer();
        //khoi tao socket 
        socket = socketServer(server);
        //console.log(server.app);
        socket.receive((receive) => {

            receive.on(SOCKET_LOGIN, login);

            //otp
            receive.on(SOCKET_OTP, doOTP);

            //get list phone
            //trả về cho client danh sashc số đã lưu, đồng thời inject hàm getPhone vào trang web
            receive.on(SOCKET_GET_LIST_PHONE, getListPhone);

            //chuyển qua server sent event - SOCKET_SETINTERVALED_PHONE_URL
            // add number
            receive.on(SOCKET_WORKING_SINGLE_NUMBER, addNumber);

            // thêm sdt, số tiền qua file excel
            receive.on(SOCKET_WORKING_SOME_NUMBER, addSomeNumber);

            // delete sdt
            receive.on(SOCKET_WORKING_DELETE_PHONE, deletePhone);

            // edit sdt
            receive.on(SOCKET_WORKING_EDIT_PHONE, editPhone);

            //chuyển qua server sent event - SOCKET_SETINTERVALED_PHONE_URL
            // setinterval
            receive.on(SOCKET_SETINTERVAL_PHONE, prepareInterval);

            //set timewait
            receive.on(SOCKET_SET_WAIT_TIME, setWaitTime);

        });

        app.all("/*", router);


    } catch (e) {
        console.error("loi puppteer hoac socket", e);

    }
}

//render ra file html    
const router = async function (req, res) {
    if (req.url.includes(SOCKET_INTERVAL_ALL_PHONE_URL)) {
        setIntervalPhone(res);
    } else if (req.url.includes(SOCKET_INTERVAL_EACH_PHONE_URL)) {
        console.log("each number", req.query.phone, req.query.money);
        addNumber({ phone: req.query.phone, money: req.query.money }, res);
    } else {
        //render ra file html
        receive(req, res);
    }
};

const setWaitTime = async (data) => {
    WAIT_TIME = data.waitTime;
}

const getNumberInfo = async (phone, urlID, driver) => {
    return new Promise(async (res, rej) => {
        try {
            // need to update to crawl data
            //goto url
            if (urlID === 1) {
                await driver.goto(URL_1);
                //hàm readyState đối với cá trang này không có hiệu quả
                await driver.waitForFunction('document.readyState === "complete"');
                //cần check xem ô input có bị null không là được

                // input phone
                // let selector = "#ContentPlaceHolder_Main_ContentPlaceHolder_Text_txtThueBao";
                // await driver.$eval(selector, (el, value) => el.value = value, phone);

                // input phone
                await driver.evaluate('async function getE(){' +
                    'return new Promise(async (res)=>{' +
                    'function timer(ms){return new Promise((res)=>setTimeout(res,ms))};' +
                    'let doM = document.querySelector("#ContentPlaceHolder_Main_ContentPlaceHolder_Text_txtThueBao");' +
                    'let rTry = 0;' +
                    'while(!doM && rTry == 50){' +
                    'await timer(200);' +
                    'doM = document.querySelector("#ContentPlaceHolder_Main_ContentPlaceHolder_Text_txtThueBao");' +
                    'rTry++;' +
                    '}' +
                    'if(doM) {doM.value=' + phone + '};' +
                    'res(1);'+
                    '});' +
                    '};' +
                    'getE();');

                // select to button search & click button
                // selector = "#ContentPlaceHolder_Main_ContentPlaceHolder_Text_btTraCuu";
                // await Promise.all([driver.click(selector)]);

                await driver.evaluate('async function getE(){' +
                'return new Promise(async (res)=>{' +
                    'function timer(ms){return new Promise((res)=>setTimeout(res,ms))};' +
                    'let doM = document.querySelector("#ContentPlaceHolder_Main_ContentPlaceHolder_Text_btTraCuu");' +
                    'let rTry = 0;' +
                    'while(!doM && rTry == 50){' +
                    'await timer(200);' +
                    'doM = document.querySelector("#ContentPlaceHolder_Main_ContentPlaceHolder_Text_btTraCuu");' +
                    'rTry++;' +
                    '}' +
                    'if(doM) {doM.click()};' +
                    'res(1);'+
                    '});' +
                    '};' +
                    'getE();');

                await timer(100);

                //await driver.waitForSelector('#showLoading', { visible: false })

                let loadingIndicate = await driver.evaluate('function getE(){' +
                    'let iframe = document.querySelector("#divLoading");' +
                    'return iframe ? iframe.style.display : "none"' +
                    '};' +
                    'getE();');

                while (loadingIndicate != 'none') {
                    loadingIndicate = await driver.evaluate('function getE(){' +
                        'let iframe = document.querySelector("#divLoading");' +
                        'return iframe ? iframe.style.display : "none"' +
                        '};' +
                        'getE();');
                }

                // let tkChinh = await driver.$$eval("#ContentPlaceHolder_Main_ContentPlaceHolder_Text_txtTKC", spanData => spanData.map((span) => {
                //     return JSON.stringify(span.value);
                // }));

                let tkChinh = await driver.evaluate('async function getE(){' +
                'return new Promise(async (res)=>{' +
                    'function timer(ms){return new Promise((res)=>setTimeout(res,ms))};' +
                    'let doM = document.querySelector("#ContentPlaceHolder_Main_ContentPlaceHolder_Text_txtTKC");' +
                    'let rTry = 0;' +
                    'while(!doM && rTry == 50){' +
                    'await timer(200);' +
                    'doM = document.querySelector("#ContentPlaceHolder_Main_ContentPlaceHolder_Text_txtTKC");' +
                    'rTry++;' +
                    '}' +
                    'res(doM ? doM.value : "");' +
                    '});' +
                    '};' +
                    'getE();');

                console.log("tkChinh", tkChinh);
                tkChinh=tkChinh.replace(/\./g,"");
                res(tkChinh);
            } else {
                await driver.goto(URL_2);
                await driver.waitForFunction('document.readyState === "complete"');

                // input phone
                // let selector = "#txtThueBao";
                // await driver.$eval(selector, (el, value) => el.value = value, phone);

                await driver.evaluate('async function getE(){' +
                'return new Promise(async (res)=>{' +
                    'function timer(ms){return new Promise((res)=>setTimeout(res,ms))};' +
                    'let doM = document.querySelector("#txtThueBao");' +
                    'let rTry = 0;' +
                    'while(!doM && rTry == 50){' +
                    'await timer(200);' +
                    'doM = document.querySelector("#txtThueBao");' +
                    'rTry++;' +
                    '}' +
                    'if(doM) {doM.value=' + phone + '};' +
                    'res(1);'+
                    '});' +
                    '};' +
                    'getE();');

                // select to button search & click button
                // selector = "#btnSearch";
                // await Promise.all([driver.click(selector)]);

                await driver.evaluate('async function getE(){' +
                'return new Promise(async (res)=>{' +
                    'function timer(ms){return new Promise((res)=>setTimeout(res,ms))};' +
                    'let doM = document.querySelector("#btnSearch");' +
                    'let rTry = 0;' +
                    'while(!doM && rTry == 50){' +
                    'await timer(200);' +
                    'doM = document.querySelector("#btnSearch");' +
                    'rTry++;' +
                    '}' +
                    'if(doM) {doM.click()};' +
                    'res(1);'+
                    '});' +
                    '};' +
                    'getE();');

                await timer(100);
                //await driver.waitForSelector('#showLoading', { visible: false })
                let loadingIndicate = await driver.evaluate('function getE(){' +
                    'let iframe = document.querySelector("#showLoading");' +
                    'return iframe ? iframe.style.display : "none"' +
                    '};' +
                    'getE();');

                while (loadingIndicate != 'none') {
                    loadingIndicate = await driver.evaluate('function getE(){' +
                        'let iframe = document.querySelector("#showLoading");' +
                        'return iframe ? iframe.style.display : "none"' +
                        '};' +
                        'getE();');
                }

                // let tkChinh = await driver.$$eval("#txtTKC", spanData => spanData.map((span) => {
                //     return JSON.stringify(span.value);
                // }));

                let tkChinh = await driver.evaluate('async function getE(){' +
                'return new Promise(async (res)=>{' +
                    'function timer(ms){return new Promise((res)=>setTimeout(res,ms))};' +
                    'let doM = document.querySelector("#txtTKC");' +
                    'let rTry = 0;' +
                    'while(!doM && rTry == 50){' +
                    'await timer(200);' +
                    'doM = document.querySelector("#txtTKC");' +
                    'rTry++;' +
                    '}' +
                    'res(doM ? doM.value : "");' +
                    '});' +
                    '};' +
                    'getE();');

                console.log("tkChinh", tkChinh);
                tkChinh=tkChinh.replace(/\./g,"");
                res(tkChinh);
            }

            // console.log("phone", phone, "money", number[0]);
            // res(number[0]);


        } catch (e) {
            console.log("getNumberInfo error ", phone, e);
            rej(e);
        }
    });
}

const login = function (data) {
    console.log("login voi username va password", data.username, data.password);
    doLogin(data.username, data.password, socket, driver);
}

//otp
const doOTP = function (data) {
    try {
        console.log("Xac thuc voi OTP : ", data.otp);
        doOTPChecking(data.otp, socket, driver);
    } catch (e) {
        console.log("doOTP error ", e);
    }
}

const getListPhone = async function (data) {
    socket.send(SOCKET_LIST_PHONE, arrayNumber);
}

const findIndex = num => {
    let tempIndex = -1;
    arrayNumber.some((item, index) => {
        if (item.phone == num) {
            tempIndex = index;
            return true;
        }
    });
    return tempIndex; d
}

const duplicateNumber = num => {
    let bool = false;
    bool = arrayNumber.some((item) => {
        if (item.phone.trim() == num.trim())
            return true;
    });
    return bool;
}

//===========================================================================================================================================

const addNumber = async function (data) {
    //kiểm tra có bị trùng
    //ép kiểu về string
    data.phone = data.phone + "";
    let checkDuplicate = await duplicateNumber(data.phone);
    console.log("duplicate phone", data.phone, "is", checkDuplicate);
    if (checkDuplicate == false) {
        // console.log("verifyNumberPhone data.phone", verifyNumberPhone(data.phone));
        let tempPhone = await verifyNumberPhone(data.phone);
        data.phone = tempPhone[0];
        //console.log("data.phone", data.phone);
        arrayNumber.push(data);
        //console.log("arrayNumber push",arrayNumber);
        console.log("arrayNumber length", arrayNumber.length);
        //console.log("them so", arrayNumber[arrayNumber.length - 1]);
        let tempIndex = arrayNumber.length - 1; // 3
        console.log("tempIndex of phone", data.phone, "is", tempIndex)
        socket.send(SOCKET_WORKING_ADDED_NUMBER, { status: 200, data: data });
        await csvInstance.writeFile(arrayNumber);

        //gọi lại lần đầu
        //let intertime = calculatorTime(tempIndex);

        // setTimeout(async () => {
        //     try {
        //         data.info = await getNumberInfo(data.phone, data.urlID, driver);
        //         console.log("server found that phone", data.phone, "with money", data.info, "index", tempIndex);
        //         await socket.send(SOCKET_SETINTERVALED_PHONE, { info: data.info, index: tempIndex, phone: data.phone });
        //     } catch (e) {
        //         await socket.send(SOCKET_SETINTERVALED_PHONE, { info: -1, index: tempIndex, phone: data.phone });
        //     }
        // }, WAIT_TIME);

        // arrayNumber[tempIndex].interval = setInterval(async () => { // xoa 3 >> clear interval 3
        //     //lúc thêm mới thì cần thận với cái arrayNumber.length này
        //     let idx = findIndex(data.phone);
        //     countInterval++;
        //     try {
        //         arrayNumber[idx].info = await getNumberInfo(arrayNumber[idx].phone, data.urlID, driver);
        //         console.log("server found that phone", arrayNumber[idx].phone, "with money", arrayNumber[idx].info, "index", idx);
        //         await socket.send(SOCKET_SETINTERVALED_PHONE, { info: arrayNumber[idx].info, index: idx, phone: data.phone });
        //     } catch (e) {
        //         await socket.send(SOCKET_SETINTERVALED_PHONE, { info: -1, index: idx, phone: data.phone });
        //         console.log("add number error", e);
        //     }
        // }, WAIT_TIME);
    } else {
        socket.send(SOCKET_WORKING_ADDED_NUMBER, { status: "Số điện thoại đã tồn tại", data: null });
    }

}

//===========================================================================================================================================

const calculatorTime = (j) => {
    let checkArrray = [50, 100, 150, 200, 250, 300];
    let x = 0;
    checkArrray.some((item, index) => {
        if (j < item) {
            x = index;
            return true;
        }
    });
    return WAIT_TIME + j + x * 9000;
}

const addSomeNumber = function (data) {
    //console.log("theem nhieu soos", data);
    //kiểm tra có bị trùng
    arrayNumber.push(data);
    socket.send(SOCKET_WORKING_ADDED_SOME_NUMBER, data);
}

const deletePhone = function (data) {
    console.log("delete with phone and money", data);
    console.log("list number from server", arrayNumber);
    clearInterval(arrayNumber[data.index].interval);
    arrayNumber.splice(data.index, 1);
    csvInstance.writeFile(arrayNumber);
    socket.send(SOCKET_WORKING_DELETED_PHONE, { index: data.index });
}

const editPhone = function (data) {
    arrayNumber[data.index].phone = data.phone;
    arrayNumber[data.index].money = data.money;
    csvInstance.writeFile(arrayNumber);
    socket.send(SOCKET_WORKING_EDITED_PHONE, { index: data.index, phone: data.phone, money: data.money });
}


//hàm này chạy đầu tiên, nên hàm này sẽ inject hàm getPhone vào trang web, và khởi tạo một interval chuyên dọn dẹp các interval để giảm thiêu dung lượn cho trang web

const prepareInterval = async (data) => {

    //await removeIntervalForLightenWeb();

    await setIntervalPhone(data);

}

//===================================================================================================================================
const setIntervalPhone = async function (data) {
    try {
        //inject hàm getPhone
        //await inJectGetPhone();

        //await removeIntervalForLightenWeb();

        WAIT_TIME = data.waitTime ? data.waitTime * 1000 : 8000;

        await socket.send(SOCKET_LOG, { message: "setIntervalPhone" });

        mainInterval = setInterval(async () => {
            try {
                console.log("countInterval", countInterval);
                let item = arrayNumber[countInterval];
                console.log("data.urlID", data.urlID);
                console.log("countInterval", countInterval, "item", item);
                item.info = await getNumberInfo(item.phone, data.urlID, driver);
                console.log("server found that phone", item.phone, "with money", item.info, "index", countInterval);
                await socket.send(SOCKET_SETINTERVALED_PHONE, { info: item.info, index: countInterval, phone: item.phone });
            } catch (e) {
                console.log("interval error", e);
                await socket.send(SOCKET_SETINTERVALED_PHONE, { info: -1, index: countInterval, phone: item.phone });
            }
            try {
                countInterval++;
                if (countInterval == arrayNumber.length) {
                    console.log("back to first");
                    countInterval = 0;
                }
            } catch (e) {
                console.log("countInterval error", e);
                await socket.send(SOCKET_SETINTERVALED_PHONE, { info: -1, index: countInterval, phone: item.phone });
            }
        }, WAIT_TIME);

        // arrayNumber.forEach(async (item, index) => {
        //     //goi lan dau

        //     let intervalTime = calculatorTime(index);
        //     setTimeout(async () => {
        //         try {
        //             item.info = await getNumberInfo(item.phone, data.urlID, driver);
        //             console.log("server found that phone", item.phone, "with money", item.info, "index", index);
        //             await socket.send(SOCKET_SETINTERVALED_PHONE, { info: item.info, index: index, phone: item.phone });
        //         } catch (e) {
        //             await socket.send(SOCKET_SETINTERVALED_PHONE, { info: -1, index: index, phone: item.phone });
        //         }
        //     }, WAIT_TIME);

        //     item.interval = setInterval(async () => {
        //         countInterval++;
        //         let idx = findIndex(item.phone);
        //         try {
        //             item.info = await getNumberInfo(item.phone, data.urlID, driver);
        //             console.log("server found that phone", item.phone, "with money", item.info, "index", index);
        //             await socket.send(SOCKET_SETINTERVALED_PHONE, { info: item.info, index: idx, phone: item.phone });
        //         } catch (e) {
        //             await socket.send(SOCKET_SETINTERVALED_PHONE, { info: -1, index: idx, phone: item.phone });
        //         }
        //     }, WAIT_TIME);
        // });
    } catch (e) {
        console.log("setIntervalPhone", e);
        await socket.send(SOCKET_LOG, { message: "loi " + e });
    }
}

export default workingController;