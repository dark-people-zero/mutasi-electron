const { ipcRenderer } = require('electron');
const ipc = ipcRenderer;
ipc.on("config", (event, data) => {
    localStorage.setItem("data", JSON.stringify(data));
});
const axios = require('axios');
const qs = require('querystring');
var captcha = null;

window.alert = function(){};
window.confirm = function(){};

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
    }else if(halamanLogin()) {
        await login();
        loginClick();
    }else if(checkHalamanUtama()) {
        console.log("halaman Utama");
        getSaldoDanMutasi(data);
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
    data.account_username = "vriskanandya24";
    data.account_password = "Aa788888";
    data.rekening_number = "110901002575537";

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
        }else if(res == "ERROR_WRONG_CAPTCHA_ID"){
            setTimeout(() => {
                login();
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

function checkHalamanUtama() {
    return document.body.textContent.toLowerCase().includes('informasi & mutasi');
}

function getSaldoDanMutasi(data) {
    data.rekening_number = "110901002575537";
    document.getElementById("myaccounts").click();
    var datax = {
        saldo: null,
        mutasi: null
    }
    setTimeout(() => {
        console.log("masuk ke halaman account");
        var iframeMenu = document.getElementById('iframemenu');
        if (iframeMenu) {
            console.log("iframe dapet");
            if (datax.saldo == null) {
                iframeMenu.contentWindow.document.querySelector('a[href="BalanceInquiry.html"]').click();
                setTimeout(() => {
                    console.log("masuk ke halaman balance");
                    var iframeContent = document.getElementById('content');
                    if (iframeContent) {
                        console.log("irame content dapet");
                        var tableSaldo = iframeContent.contentWindow.document.querySelector('#tabel-saldo');
                        datax.saldo = tableSaldo.outerHTML;

                        if (datax.mutasi == null) {
                            console.log("berarti slado udah dapet ini saldonya", datax.saldo);
                            iframeMenu.contentWindow.document.querySelector('a[href="AccountStatement.html"]').click();
                            setTimeout(() => {
                                var iframeContent = document.getElementById('content');
                                if (iframeContent) {
                                    iframeContent.contentWindow.document.getElementById('ACCOUNT_NO').value = data.rekening_number;
                                    iframeContent.contentWindow.document.querySelector('input[name="submitButton"]').click();

                                    setTimeout(() => {
                                        var tableMutasi = iframeContent.contentWindow.document.querySelector('#tabel-saldo');
                                        datax.mutasi = tableMutasi.outerHTML;

                                        ipc.send("recive:data", {
                                            rek: data,
                                            hasil: datax
                                        })
                                        console.log(datax);
                                        logout();
                                    }, 3000);
                                }
                            }, 2000);
                        }
                    }
                }, 2000);
            }
        }
    }, 2000);
}


function logout() {
    console.log("proses logout");
    document.querySelector('a[href="Logout.html"]').click();
}