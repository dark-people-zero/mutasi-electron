const { ipcRenderer } = require('electron');
const ipc = ipcRenderer;
ipc.on("config", (event, data) => {
    localStorage.setItem("data", JSON.stringify(data));
});
const axios = require('axios');
const qs = require('querystring');
var captcha = null;

document.addEventListener("DOMContentLoaded", async function() {
    var data = JSON.parse(localStorage.getItem("data"));
    if (checkRejectIp()) {
        ipc.send("win:reload", data)
    }else if(cekErrorCaptcha()){
        ipc.send("try:ip:reset", data);
        var tryCaptcha = ipc.sendSync("try:captcha", data);
        if (tryCaptcha) {
            // lakukan proses login ulang
            await login();
            loginClick();
        }else{
            ipc.send("win:close", data.rekening_number);
        }
    }else if(cekErrorPass()){
        ipc.send("try:ip:reset", data);
        ipc.send("try:captcha:reset", data);
        data.message = "Salah username atau password";
        ipc.send("try:log:error", data);
        ipc.send("win:close", data.rekening_number);
    }else if (halamanLogin()) {
        await login();
        loginClick();
    }
})

function checkRejectIp() {
    return document.body.textContent.includes("The requested URL was rejected");
}

function halamanLogin() {
    return document.getElementById("loginForm");
}

function cekErrorPass() {
    // cek apakah di halaman login
    var form = halamanLogin()
    if (form) {
        return document.body.textContent.includes("BBR00P2 - User ID / Password does not match.");
    }else{
        return false;
    }
}

function cekErrorCaptcha() {
    // cek apakah di halaman login
    var form = halamanLogin()
    if (form) {
        return document.body.textContent.includes("BBR00C2");
    }else{
        return false;
    }
}

async function login() {
    await getImage();
    var data = JSON.parse(localStorage.getItem("data"));
    var lang = document.querySelector('input[name="j_language"]').value;
    if (lang == "en_EN") document.querySelector('input[placeholder="username"]').value = data.account_username;
    if (lang == "in_ID") document.querySelector('input[placeholder="user ID"]').value = data.account_username;
    document.querySelector('input[placeholder="password"]').value = data.account_password;
    
    document.querySelector('input[name="j_username"]').value = data.account_username;
    document.querySelector('input[name="j_password"]').value = data.account_password;    
}

async function getImage() {
    var image = document.querySelector("#simple_img img");
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    canvas.getContext('2d').drawImage(image, 0, 0);
    const dataURL = canvas.toDataURL();
    console.log(dataURL);
    var data = qs.stringify({
        'method': "base64",
        'key': 'rxcgsuhujzkqcwrsab8y5db1dqvljl3h',
        'body': dataURL.replace('data:', '').replace(/^.+,/, ''),
    });
    var config = {
        method: 'post',
        url: 'https://azcaptcha.com/in.php',
        headers: { 
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        data : data
    };

    axios(config).then(function (response) {
        var res = response.data.replace("OK|","");
        getCaptcha(res);
    }).catch(function (error) {
        console.error(error);
    });

}

function getCaptcha(id) {
    axios({
        method: 'get',
        url: 'https://azcaptcha.com/res.php?key=rxcgsuhujzkqcwrsab8y5db1dqvljl3h&action=get&id='+id,
    }).then(function (response) {
        var res = response.data.replace("OK|","");
        if (res == "CAPCHA_NOT_READY") {
            setTimeout(() => {
                getCaptcha(id);
            }, 1000);
        }else{
            document.querySelector('input[name="j_code"]').value = res;
        }
    }).catch(function (error) {
        console.log(error);
    });
}

function loginClick() {
    var username, password, code;
    var lang = document.querySelector('input[name="j_language"]').value;
    if (lang == "en_EN") username = document.querySelector('input[placeholder="username"]').value;
    if (lang == "in_ID") username = document.querySelector('input[placeholder="user ID"]').value;
    password = document.querySelector('input[placeholder="password"]').value;
    
    code = document.querySelector('input[name="j_code"]').value;

    if (username != "" && password != "" && code != "") {
        document.querySelector('button[type="submit"]').click();
    }else{
        setTimeout(() => {
            loginClick();
        }, 1000);
    }
}
