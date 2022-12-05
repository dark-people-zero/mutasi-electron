const { ipcRenderer } = require('electron');
const ipc = ipcRenderer;
ipc.on("config", (event, data) => {
    localStorage.setItem("data", JSON.stringify(data));
});
const axios = require('axios');
const qs = require('querystring');
var captcha = null;

const func = {
    chekLoading: () => {
        var c =  document.querySelector("html").classList.contains("mobile");
        if (!c) c = document.querySelector("html").classList.contains("tablet");
        return c;
    },
    getImage: async (data) => {
        var image = document.querySelector("#IMAGECAPTCHA");
        const canvas = document.createElement('canvas');
        setTimeout(() => {
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            canvas.getContext('2d').drawImage(image, 0, 0);
            const dataURL = canvas.toDataURL();
            const base64 = dataURL.replace('data:', '').replace(/^.+,/, '');
            ipc.send("image:captcha:set", {
                bank: data,
                base64: base64
            })

            var captchaCode = ipc.sendSync("image:captcha:get", data);
        }, 1000);
        // console.log(dataURL);
        // var data = qs.stringify({
        //     'method': "base64",
        //     'key': 'rxcgsuhujzkqcwrsab8y5db1dqvljl3h',
        //     'body': dataURL.replace('data:', '').replace(/^.+,/, ''),
        // });
        // var config = {
        //     method: 'post',
        //     url: 'https://azcaptcha.com/in.php',
        //     headers: { 
        //         'Content-Type': 'application/x-www-form-urlencoded'
        //     },
        //     data : data
        // };

        // axios(config).then(function (response) {
        //     var res = response.data.replace("OK|","");
        //     getCaptcha(res);
        // }).catch(function (error) {
        //     console.error(error);
        // });
    },
    halamanPilihBahasa: () => {
        return document.getElementById("RetailUser") ? true : false;
    },
    halamanLoginInput: () => {
        return document.getElementById("CorpId") ? true : false;
    },
    input: (data) => {
        document.getElementById("CorpId").value = data.account_username;
        document.getElementById("PassWord").value = data.account_password;
        document.querySelector('form input[type="submit"]').click();
    },
    checkSession: () => {
        var c = document.body.textContent.toLowerCase().includes('sesi berakhir');
        if (!c) c = document.body.textContent.toLowerCase().includes('sesi anda berakhir');
        return c;
    },
    checkError: {
        password: () => {
            return document.body.textContent.includes('User ID atau password yang anda masukkan salah');
        },
        doubleAccount: () => {
            return document.body.textContent.includes('User-id Anda terdeteksi sedang login');
        },
        errorLainnya: () => {
            return document.getElementById("Display_MConError") ? true : false;
        }
    },
    getSaldo: (data) => {
        // script get saldo
        var x = document.querySelectorAll('.MainMenuStyle')
        var btnRekening = [...x].filter(e => e.textContent.toLowerCase().includes('rekening'));
        var btnInfoSaldo = [...x].filter(e => e.textContent.toLowerCase().includes('informasi saldo'));
        var pilihRek = document.getElementById("MAIN_ACCOUNT_TYPE");
        var btnNextSelect = document.getElementById("AccountIDSelectRq");
        var tr = document.querySelectorAll('#OperativeDisplayTable tbody tr');
        var table = document.querySelectorAll('table');
        var mutasi = localStorage.getItem("mutasi");

        if(btnRekening.length > 0) btnRekening[0].click();
        if(btnInfoSaldo.length > 0) btnInfoSaldo[0].click();
        if(pilihRek) pilihRek.value = 'OPR';
        if(btnNextSelect) btnNextSelect.click()

        if (tr.length > 0) {
            var td = [...tr].filter(e => e.children[1].textContent.includes(data.rekening_number))
            if (td.length > 0) {
                td[0].children[0].querySelector('input').checked = true;
                document.getElementById("BalInqRq").click();
            }
        }

        if (table.length > 0) {
            var saldo = [...table].filter(e => e.getAttribute('id').includes('BalanceDisplayTable'));
            if (saldo.length > 0) {
                saldo = [...saldo].map(e => e.outerHTML)
                localStorage.setItem("saldo", JSON.stringify(saldo));
                if (mutasi == null) func.getMutasi();
            }
        }

        
    },
    getMutasi: (data) => {
        var x = document.querySelectorAll('.MainMenuStyle')
        if (x.length == 0) x = document.querySelectorAll('.MainMenuStyleQL');
        var tr = document.querySelectorAll('#OperativeDisplayTable tbody tr');
        var period = document.getElementById("TxnPeriod");
        var btnLanjut = document.getElementById("FullStmtInqRq");
        var pilihRek = document.getElementById("MAIN_ACCOUNT_TYPE");
        var btnNextSelect = document.getElementById("AccountIDSelectRq");
        var btnNext = document.getElementById('NextData');
        var paginate = document.getElementById("Pagination");
        
        
        var btn = [...x].filter(e => e.textContent.toLowerCase().includes('mutasi rekening'));
        if (btn.length > 0) btn[0].click()

        if (tr.length > 0) {
            var td = [...tr].filter(e => e.children[1].textContent.includes(data.rekening_number))
            if (td.length > 0) {
                td[0].children[0].querySelector('input').checked = true;
            }
        }

        if(pilihRek) pilihRek.value = 'OPR';
        if(btnNextSelect) btnNextSelect.click();
        
        if (period) period.value = "Today";
        if (btnLanjut) btnLanjut.click()

        if (paginate) {
            setTimeout(() => {
                console.log("mulai ambil data mutasi");
                var table = document.querySelectorAll('#Pagination .CommonTableClass');
                var data = localStorage.getItem('mutasiTemp') == null ? [] : JSON.parse(localStorage.getItem('mutasiTemp'));
                var temp = {
                    tanggal: '',
                    uraian: '',
                    tipe: '',
                    tagihan: '',
                    saldo: '',
                };
                [...table].forEach((e,i) => {
                    if (i > 0) {
                        var h = e.querySelector('.BodytextCol1');
                        var v = e.querySelector('.BodytextCol2');
                        var nl = e.querySelector('.clsLine');
                        var ve = e.querySelector('.clsPaginationLine1');
        
                        if (!v) v = e.querySelector('.CrText');
                        if (h && v) {
                            if (h.textContent.includes('Tanggal')) temp.tanggal = v.textContent;
                            if (h.textContent.includes('Uraian')) temp.uraian = v.textContent;
                            if (h.textContent.includes('Tipe')) temp.tipe = v.textContent;
                            if (h.textContent.includes('Tagihan')) temp.tagihan = v.textContent;
                            if (h.textContent.includes('Saldo')) temp.saldo = v.textContent;
                        }
                        if(nl || ve) {
                            data.push(temp);
                            temp = {
                                tanggal: '',
                                uraian: '',
                                tipe: '',
                                tagihan: '',
                                saldo: '',
                            }
                        }
                    }
                })
        
                localStorage.setItem('mutasiTemp', JSON.stringify(data))
                if (btnNext && data.length > 0) {
                    console.log("mulai next pagination");
                    btnNext.click();
                }else{
                    localStorage.setItem("mutasi", JSON.stringify(data));
                }
            }, 3000);
        }

    },
    logout: () => {
        // LogOut
    }
}

document.addEventListener("DOMContentLoaded", async function() {
    console.log("masuk ke pertama");
    var data = JSON.parse(localStorage.getItem("data"));
    var status = localStorage.getItem("statusRobot");
    var saldo = localStorage.getItem("saldo");
    var mutasi = localStorage.getItem("mutasi");
    var err = localStorage.getItem("error");
    
    // data.account_username = "ANPR1478616";
    // data.account_password = "aa778899";
    // data.rekening_number = "00000001354008613";
    data.account_username = "RAMA1467234";
    data.account_password = "aa778899";
    data.rekening_number = "00000001340989804";
    
    if (func.chekLoading()) {
        ipc.send("win:reload", data);
    }else if(func.halamanPilihBahasa()){
        document.getElementById("RetailUser").click();
    }else if(func.halamanLoginInput()){
        console.log("masuk ke halaman login");
        if(status || status == null) func.input(data);
    }else if(func.checkError.password()) {
        var errMessage = document.getElementById("Display_MConError").textContent;
        localStorage.setItem("error", errMessage);
        console.log("error", errMessage);
    }else if(func.checkError.doubleAccount()) {
        var errMessage = document.getElementById("Display_MConError").textContent;
        localStorage.setItem("error", errMessage);
        console.log("error", errMessage);
    }else if(func.checkError.errorLainnya()) {
        var errMessage = document.getElementById("Display_MConError").textContent;
        localStorage.setItem("error", errMessage);
        console.log("error", errMessage);
    }else if(saldo == null && err == null){
        console.log("proses get saldo");
        func.getSaldo(data);
    }else if(mutasi == null && err == null){
        console.log("proses get mutasi");
        func.getMutasi(data);
    }else if(func.checkSession()){
        console.log("masuk ke session berakhir");
        document.getElementById("Login").click();
    }else{
        console.log("halaman belum diketahui");
    }
})