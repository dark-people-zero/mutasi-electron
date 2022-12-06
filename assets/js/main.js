window.$ = window.jQuery = require("jquery");
const { select2 } = require("select2")(jQuery);
const { ipcRenderer } = require('electron');
const ipc = ipcRenderer;
var disablePull = false;
var dataRekening = [];

closeBtn.addEventListener('click', () => ipc.send("win:close", "main"));
minimizeBtn.addEventListener('click', () => ipc.send('win:minimize', "main"));
maxResBtnFull.addEventListener('click', () => {
    document.getElementById("maxResBtnFull").style.display = 'none';
    document.getElementById("minResBtnFull_exit").style.display = 'inline-block';

    ipc.send("win:maximizeRestore", "main");
})
minResBtnFull_exit.addEventListener('click', () => {
    document.getElementById("maxResBtnFull").style.display = 'inline-block';
    document.getElementById("minResBtnFull_exit").style.display = 'none';
    ipc.send("win:maximizeRestore", "main");
})

var dataBank = ipc.sendSync("listBank");

var selectBank = $("#selectBank").select2({
    data: dataBank.map(e => {
        e.text = e.name;
        e.id = e.bank_code;
        return e;
    }),
    placeholder: "Silahkan Pilih Bank",
    allowClear: true
})

selectBank.on('select2:open', function(e) {
    $('input.select2-search__field').prop('placeholder', 'Cari..');
});

selectBank.on('select2:select', function (e) {
    var data = e.params.data;
    ipc.send("bankActive", data.bank_code);
    dataRekening = [];
    setTable();
}).on("select2:clear", () => {
    dataRekening = [];
    setTable();
});

$("#pullRekening").click(() => {
    var val = $("#selectBank").val();
    if (val && !disablePull) {
        $(".loading").addClass("show");
        ipc.send("listRekening", val);
    }
})

ipc.on("recive:listRekening", (event, data) => {
    dataRekening = [];
    if (data !== undefined) {
        Object.keys(data).forEach(key => {
            data[key].forEach(val => {
                val.situs = key;
                val.status = "Off";
                val.class = "badge badge-sm bg-warning text-dark";
                dataRekening.push(val);
            });
        });
    }

    setTable();
})

function setTable() {
    var templateNull = $(`
        <tr>
            <td colspan="6" class="text-center">Belum data rekening / data rekening tidak di temukan</td>
        </tr>
    `)
    var target = $("#tableRekening tbody");
    target.children().remove();
    if (dataRekening.length > 0) {
        dataRekening.forEach((e,i) => {
            var template = $(`
                <tr id="${e.situs}-${e.rekening_number}" class="text-center">
                    <td>${i+1}</td>
                    <td>${e.situs}</td>
                    <td>${e.rekening_number}</td>
                    <td class="text-start">${e.account_title}</td>
                    <td>${e.account_username}</td>
                    <td>
                        <small class="${e.class}">${e.status}</small>
                    </td>
                </tr>
            `)

            target.append(template);
        });
    }else{
        target.append(templateNull);
    }

    $(".loading").removeClass("show");
}

// start robot 
$("#startRobot").click(function() {
    if (dataRekening.length > 0) {
        disablePull = true;
        $("#selectBank").prop('disabled', true);
        $(this).hide();
        $("#stopRobot").show();
        startRobot();
    }
})

// stop robot 
$("#stopRobot").click(function() {
    disablePull = false;
    $("#selectBank").prop('disabled', false);
    $(this).hide();
    $("#startRobot").show();

    dataRekening = dataRekening.map(e => {
        e.status = "Off";
        e.class = "badge badge-sm bg-warning text-dark";
        return e;
    });

    setTable();
})

function startRobot() {
    dataRekening[0].status = "create windows";
    dataRekening[0].class = "badge bg-info text-dark";
    dataRekening[0].account_username = "vriskanandya24";
    dataRekening[0].account_password = "Aa788888";
    dataRekening[0].rekening_number = "110901002575537";
    
    setTable();
    var data = dataRekening[0];
    ipc.send("win:create",data);
}