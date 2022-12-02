const {
	app,
	BrowserWindow,
	screen,
	ipcMain,
	session,
	desktopCapturer
} = require("electron");
const path = require("path");
const fs = require("fs");
const qs = require("querystring");
const moment = require("moment");
const axios = require('axios');
const randomUseragent = require('random-useragent');

const setting = require("./setting.json");

const createWindow = (params) => {
	var conf = {
		minWidth: 940,
		minHeight: 560,
		frame: false,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
		},
		icon: __dirname+"/favicon.png"
	};

	if (params.frame) conf.frame = params.frame;
	if (params.autoHideMenuBar) conf.autoHideMenuBar = params.autoHideMenuBar;
	if (params.nodeIntegration) conf.webPreferences.nodeIntegration = params.nodeIntegration;
	if (params.nativeWindowOpen) conf.webPreferences.nativeWindowOpen = params.nativeWindowOpen;
	if (params.contextIsolation) conf.webPreferences.contextIsolation = params.contextIsolation;
	if (params.preload) conf.webPreferences.preload = path.join(__dirname, params.preload);
	if (params.width) conf.minWidth = params.width;
	if (params.width) conf.width = params.width;
	if (params.height) conf.minHeight = params.height;
	if (params.height) conf.height = params.height;
	if (params.resizable != null) conf.resizable = params.resizable;
	if (params.x != null) conf.x = params.x;
	if (params.y != null) conf.y = params.y;

	const win = new BrowserWindow(conf);

	if (params.type == "file") win.loadFile(params.target);
	if (params.type == "url") {
		if (params.userAgent) {
			win.loadURL(params.target, {userAgent: params.userAgent});
		}else{
			win.loadURL(params.target);
		}
	}
	return win;
};

const window = {};
const userAgentList = {};
const percobaan = {
	ip: {},
	captcha: {}
}

var timeStart = moment();

const func = {
	init: async () => {
		await func.bk.init();
	},
	bk: {
		init: async () => {
			try {
				var timeAuthorize = timeStart.startOf().fromNow().replace(/[^0-9\.]+/g, '');
				if (timeAuthorize >= 5) {
					timeStart = moment();
					await func.bk.login();
				}

				await func.bk.situs();
				var situs = func.situs.get();
				await situs.forEach(async e => {
					if (e.site_is_active.toLowerCase() == "y") {
						await func.bk.bank(e.site_code);
					}
				});
				var bank = func.bank.get();
				Object.keys(bank).forEach(async e => {
					var listBank = bank[e].filter(x => x.bank_is_active.toLowerCase() == "y" && x.bank_code == setting.bankActive);
					if (listBank.length > 0) {
						await listBank.forEach(async val => {
							await func.bk.rekening(e, val.bank_code);
						});
						
					}
				});
			} catch (error) {
				log.sistem("function bk init => "+error.message);
			}
		},
		login: async () => {
			try {
				var data = qs.stringify({
					'user_email': setting.userLogin.email,
					'user_password': setting.userLogin.password 
				});
				var config = {
					method: 'post',
					url: setting.urlLogin,
					data : data
				};
	
				await axios(config).then(function (response) {
					var res = response.data;
					if (res.status) {
						var cnf = func.config.get();
						cnf.authorization = res.data.authorization;
						func.config.put(cnf);
					}else{
						var err = JSON.stringify(res.errors);
						log.sistem("axios response bk login => "+err);
					}
				}).catch(function (error) {
					log.sistem("axios bk login => "+error.message);
				});
			} catch (error) {
				log.sistem("function bk login => "+error.message);
			}
		},
		situs: async () => {
			try {
				var config = {
					method: 'get',
					url: setting.urlSitus,
				};
	
				await axios(config).then(function (response) {
					var res = response.data;
					if (res.status) {
						var dt = res.data.filter(e => e.site_is_active.toLowerCase() == "y")
						func.situs.put(dt);
					}else{
						var err = JSON.stringify(res.errors);
						log.sistem("axios response bk situs => "+err);
					}
				}).catch(function (error) {
					log.sistem("axios bk situs => "+error.message);
				});
			} catch (error) {
				log.sistem("function bk situs => "+error.message);
			}
		},
		bank: async (site) => {
			var url = setting.urlBank.replace("{site_code}", site);
			var cnf = func.config.get();
			try {
				var config = {
					method: 'get',
					url: url,
					headers: { 
						'authorization': cnf.authorization,
					}
				};
	
				await axios(config).then(function (response) {
					var res = response.data;
					if (res.status) {
						var oldData = func.bank.get();
						oldData[site] = res.data.map(e => {
							return {
								bank_code : e.bank_code,
								bank_codename : e.bank_codename,
								bank_name : e.bank_name,
								bank_is_active : e.bank_is_active,
								bank_instance_type: e.bank_instance_type
							}
						}).filter(e => {
							var type = e.bank_instance_type;
							var act = e.bank_is_active.toLowerCase();
							var isMobile = e.bank_name.toLowerCase().includes("mobile")
							return type == "bank" && act == "y" && !isMobile;
						});
						func.bank.put(oldData);
					}else{
						var err = JSON.stringify(res.errors);
						log.sistem("axios response bk bank situs "+site+" => "+err);
					}
				}).catch(function (error) {
					log.sistem("axios bk bank situs "+site+" => "+error.message);
				});
			} catch (error) {
				log.sistem("function bk bank situs "+site+" => "+error.message);
			}
		},
		rekening: async (site, bank) => {
			var url = setting.urlRekening.replace("{site_code}", site).replace("{bank_code}", bank);
			var cnf = func.config.get();
			try {
				var config = {
					method: 'get',
					url: url,
					headers: { 
						'authorization': cnf.authorization,
					}
				};
	
				await axios(config).then(function (response) {
					var res = response.data;
					if (res.status) {
						var oldData = func.rekening.get();
						if (!oldData[bank]) oldData[bank] = {};
						oldData[bank][site] = res.data.data.map(e => {
							return {
								account_title: e.account_title,
								account_title_alias: e.account_title_alias,
								account_username: e.account_username,
								account_password: e.account_password,
								account_is_active: e.bank_is_active,
								rekening_number: e.rekening_data[0].rekening_number
							}
						}).filter(e => {
							var act = e.account_is_active.toLowerCase();
							return act == "y";
						});
						func.rekening.put(oldData);
					}else{
						var err = JSON.stringify(res.error);
						log.sistem("axios response bk rekening situs "+site+" bank "+bank+" => "+err);
					}
				}).catch(function (error) {
					log.sistem("axios bk rekening situs "+site+" bank "+bank+" => "+error.message);
				});
			} catch (error) {
				log.sistem("function bk rekening situs "+site+" bank "+bank+" => "+error.message);
			}
		},
	},
	config: {
		get: () => {
			const dir = path.join(__dirname, setting.dirConfig);
			if (!fs.existsSync(dir)) {
				fs.writeFileSync(dir, JSON.stringify({}));
				return {};
			}else{
				const data = fs.readFileSync(dir);
				return JSON.parse(data);
			}
		},
		put: (data) => {
			const dir = path.join(__dirname, setting.dirConfig);
			fs.writeFileSync(dir, JSON.stringify(data));
		}
	},
	situs: {
		get: () => {
			const dir = path.join(__dirname, setting.dirSitus);
			if (!fs.existsSync(dir)) {
				fs.writeFileSync(dir, JSON.stringify({}));

				return {};
			}else{
				const data = fs.readFileSync(dir);
				return JSON.parse(data);
			}
		},
		put: (data) => {
			const dir = path.join(__dirname, setting.dirSitus);
			fs.writeFileSync(dir, JSON.stringify(data));
		}
	},
	bank: {
		get: () => {
			const dir = path.join(__dirname, setting.dirBank);
			if (!fs.existsSync(dir)) {
				fs.writeFileSync(dir, JSON.stringify({}));

				return {};
			}else{
				const data = fs.readFileSync(dir);
				return JSON.parse(data);
			}
		},
		put: (data) => {
			const dir = path.join(__dirname, setting.dirBank);
			fs.writeFileSync(dir, JSON.stringify(data));
		}
	},
	rekening: {
		get: (bank = null) => {
			const dir = path.join(__dirname, setting.dirRekening);
			if (!fs.existsSync(dir)) {
				fs.writeFileSync(dir, JSON.stringify({}));

				return {};
			}else{
				var data = JSON.parse(fs.readFileSync(dir));
				if (bank != null) {
					return data[bank];
				}else{
					return data;
				}
			}
		},
		put: (data) => {
			const dir = path.join(__dirname, setting.dirRekening);
			fs.writeFileSync(dir, JSON.stringify(data));
		}
	},
	listRekening: async (bank) => {
		await func.bk.init();
		window["main"].webContents.send("recive:listRekening",func.rekening.get(bank));
	}
}

const win = {
	create: {
		main: () => {
			window["main"] = createWindow({
				type: "file",
				target: "./pages/main.html",
			});

			window["main"].webContents.openDevTools();
		},
		child: (params) => {
			var id = params.rekening_number;
			var browserName = ['Android Browser', 'IEMobile', 'Mobile Safari', 'Opera Mobi'];
			const userAgent = randomUseragent.getRandom(e => !browserName.includes(e.browserName) && userAgentList[id] != e.userAgent)
			userAgentList[id] = userAgent;
			url = setting.listBank.filter(e => e.bank_code == setting.bankActive);
			if (url.length > 0) {
				url = url[0].url;
				window[id] = createWindow({
					frame: true,
					type: "url",
					target: url,
					preload: "./preload/bank.js",
					resizable: true,
					x: 0,
					y: 0,
					userAgent: userAgent,
					autoHideMenuBar: true,
				});
				window[id].webContents.session.clearCache();
				window[id].webContents.session.clearStorageData();
				window[id].webContents.send("config", params)
				window[id].webContents.openDevTools();
			}
		}
	},
	reload: {
		child: (params) => {
			var id = params.rekening_number;
			var tr = tryCreate.ip.get(id);
			win.close(id);
			if (tr > 10) {
				log.error(params);
			}else{
				win.create.child(params);
				tryCreate.ip.set(id);
			}
		}
	},
	close: (name) => {
		if (name == "main") {
			Object.keys(window).forEach(e => {
				if (window[e]) {
					window[e].close();
					delete window[e];
					delete userAgentList[e];
				}
			});
		}else{
			if (window[name]) {
				window[name].close();
				delete window[name];
				delete userAgentList[name];
			}
		}
		
	},
	minimize: (name) => {
		if (window[name]) window[name].minimize();
	},
	maximizeRestore: (name) => {
		if (window[name]) {
			window[name].isMaximized() ? window[name].restore() : window[name].maximize()
		}
	}
	
}

const tryCreate = {
	ip: {
		get: (id) => percobaan.ip[id] ?? 0,
		set: (id) => {
			var i = percobaan.ip[id] ?? 0;
			percobaan.ip[id] = i + 1;
		},
		reset: (id) => delete percobaan.ip[id]
	},
	captcha: {
		get: (id) => percobaan.captcha[id] ?? 0,
		set: (id) => {
			var i = percobaan.captcha[id] ?? 0;
			percobaan.captcha[id] = i + 1;
		},
		reset: (id) => delete percobaan.captcha[id]
	}
}

const log = {
	sistem: (data) => {
		try {
			const date = moment().format("DD-MM-YYYY");
			const dateTime = moment().format("DD-MM-YYYY HH:mm:ss");
			const dir = path.join(__dirname, `log`);
			if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive: true});
			const dirFile = path.join(dir, date+".txt");

			data = dateTime+"	|	"+data+"\n";
			if (fs.existsSync(dirFile)) {
				var oldData = fs.readFileSync(dirFile, 'utf8');
				oldData = oldData+data;
				fs.writeFileSync(dirFile, oldData);
			}else{
				fs.writeFileSync(dirFile, data);
			}
		} catch (error) {
			console.error(error);
		}

	},
	error: (params, message) => {
		try {
			console.log(params);
			const date = moment().format("DD-MM-YYYY");
			const dateTime = moment().format("DD-MM-YYYY HH:mm:ss");
			const dir = path.join(__dirname, `/log/error/${date}/${params.situs}/${setting.bankActive}`);
			if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive: true});
			const dirFile = path.join(dir, params.rekening_number+".txt");

			data = dateTime+"	|	"+message+"\n";
			if (fs.existsSync(dirFile)) {
				var oldData = fs.readFileSync(dirFile, 'utf8');
				oldData = oldData+data;
				fs.writeFileSync(dirFile, oldData);
			}else{
				fs.writeFileSync(dirFile, data);
			}
		} catch (error) {
			console.error(error);
		}
	},
}

ipcMain.on("win:create", (event, params) => win.create.child(params));
ipcMain.on("win:reload", (event, params) => win.reload.child(params));
ipcMain.on("win:close", (event, name) => win.close(name));
ipcMain.on("win:minimize", (event, name) => win.minimize(name));
ipcMain.on("win:maximizeRestore", (event, name) => win.maximizeRestore(name));

ipcMain.on("listBank", (event) => event.returnValue = setting.listBank);
ipcMain.on("listRekening", (event, bank) => func.listRekening(bank));
ipcMain.on("bankActive", (event, bank) => {
	setting.bankActive = bank;
	const dir = path.join(__dirname, "setting.json");
	fs.writeFileSync(dir, JSON.stringify(setting));
});

ipcMain.on("try:log:error", (event, params) => log.error(params, params.message))
ipcMain.on("try:ip:reset", (event, params) => tryCreate.ip.reset(params.rekening_number))
ipcMain.on("try:captcha:reset", (event, params) => tryCreate.captcha.reset(params.rekening_number))
ipcMain.on("try:captcha", (event, params) => {
	var id = params.rekening_number;
	tryCreate.captcha.set(id);
	var i = tryCreate.captcha.get(id);
	if (i > 5) {
		return false;
	}else{
		return true;
	}
})

app.whenReady().then(async () => {
	// await func.init();
	win.create.main();
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});