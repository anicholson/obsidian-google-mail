import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { OAuth2Client } from 'googleapis-common';
import { google, gmail_v1, chat_v1 } from 'googleapis';
const { authenticate } = require('@google-cloud/local-auth');
// import { authenticate } from '@google-cloud/local-auth';
const http = require('http');
const url = require('url');
const opn = require('open');
const fs = require('fs').promises;
const path = require('path');
const destroyer = require('server-destroy');
// Remember to rename these classes and interfaces!
// const CREDENTIALS_PATH = path.join("/Users/ldchen/Mars/.obsidian/plugins/obsidian-google-mail", 'credentials.json');
const SCOPES = [
	'https://www.googleapis.com/auth/gmail.modify'
]


interface gservice {
	authClient: any;
	gmail: any;
	scope: Array<string>;
	refresh_token: string
}

interface MyPluginSettings {
	gc: gservice
	client_id: string;
	client_secret: string;
	auth_url: string;
	credentials_path: string;
	from_label: string;
	to_label: string;
	mail_folder: string;
	cred_path: string;
	token_path: string;
}


const DEFAULT_SETTINGS: MyPluginSettings = {
	gc: {
		authClient: null,
		gmail: null,
		scope: [],
		refresh_token: ""
	},
	client_id: "",
	client_secret: "",
	auth_url: "",
	credentials_path: "",
	from_label: "",
	to_label: "",
	mail_folder: "",
	cred_path: "",
	token_path: "./.token.json"
}

/**
 * Open an http server to accept the oauth callback. In this simple example, the only request to our webserver is to /callback?code=<code>
 */
// async function authenticate(gc: gservice) {
// 	console.log("in authentic")
// 	return new Promise((resolve, reject) => {
// 		// grab the url that will be used for authorization
// 		const oauth2Client = gc.authClient
// 		const authorizeUrl = oauth2Client.generateAuthUrl({
// 			access_type: 'offline',
// 			scope: gc.scope.join(' '),
// 		});
// 		const server = http
// 			.createServer(async (req, res) => {
// 				try {
// 					if (req.url.indexOf('/oauth2callback') > -1) {
// 						const qs = new url.URL(req.url, 'http://localhost:9999')
// 							.searchParams;
// 						res.end('Authentication successful! Please return to the console.');
// 						server.destroy();
// 						const { tokens } = await oauth2Client.getToken(qs.get('code'));
// 						oauth2Client.credentials = tokens; // eslint-disable-line require-atomic-updates
// 						gc.refresh_token = oauth2Client.credentials.refresh_token || "" // eslint-disable-line require-atomic-updates
// 						resolve(oauth2Client);
// 						// return oauth2Client
// 					}
// 				} catch (e) {
// 					reject(e);
// 				}
// 			})
// 			.listen(9999, () => {
// 				// open the browser to the authorize url to start the workflow
// 				opn(authorizeUrl, { wait: false }).then(cp => cp.unref());
// 			});
// 		destroyer(server);
// 	});
// }

async function listLabels(gmail: gmail_v1.Gmail) {

	const res = await gmail.users.labels.list({
		userId: 'me'
	});
	const labels = res.data.labels;
	if (!labels || labels.length === 0) {
		console.log('No labels found.');
		return;
	}
	console.log('Labels:');
	labels.forEach((label) => {
		console.log(`- ${label.name}:${label.id}`);
	});
}

async function getLabelIDbyName(name: string, gmail: gmail_v1.Gmail) {
	const res = await gmail.users.labels.list({
		userId: 'me'
	});
	const labels = res.data.labels || [];
	let result_id = ""
	labels.forEach((label) => {
		if (label.name === name) { result_id = label.id || "" }
	});
	return result_id;
}

function base64ToUTF8(data: string) {
	return new Buffer(data, 'base64').toString("utf-8")
}

function getMailPlainText(res) {
	console.log(res.data.messages)
	const raw = ((res.data.messages || [])[0].payload?.parts || [])[0].body?.data || ""
	return base64ToUTF8(raw)
}

function replaceInMailLink(text: string) {
	const regex = /(\S*) (\(https:\/\/[^)]*\))/gm;
	return text.replace(regex, `[$1]$2`)
}

function appendPrefix(prefix: string, text: string) {
	if (prefix[prefix.length - 1] != "\n")
		prefix += "\n"
	return prefix + text
}

function formatTitle(title: string) {
	title = title.replace(/[/<>:"\\|?*]/g, "-")
	return title
}
function findTitle(list: Array<any>): string {
	for (let i = 0; i < list.length; i++) {
		if (list[i].name == "Subject")
			return list[i].value
	}
	return "EmptyTitle"
}

async function incr_filename(title: string, folder: string) {
	let tmp = title
	let isExist = await this.app.vault.exists(folder + "/" + `${tmp}.md`)
	let idx = 1
	while (isExist) {
		tmp = title + "_" + idx.toString()
		isExist = await this.app.vault.exists(folder + "/" + `${title}.md`)
		idx++
	}
	return tmp
}

async function saveMail(folder: string, gmail: gmail_v1.Gmail, id: string) {
	const res = await gmail.users.threads.get({
		userId: 'me',
		id: id,
		format: 'full'
	});
	const title_candidates = ((res.data.messages || [])[0].payload?.headers || [])
	let title = findTitle(title_candidates)
	title = formatTitle(title)
	title = await incr_filename(title, folder)
	// const TOKEN_PATH = path.join(folder, `${title}.md`);
	let txt = getMailPlainText(res);
	txt = replaceInMailLink(txt)
	txt = appendPrefix("tags:: #captured\n", txt)
	console.log("Save Mail: " + title)
	await this.app.vault.create(folder + "/" + `${title}.md`, txt)
	// await fs.writeFile(TOKEN_PATH, txt);
}

async function fetchMailList(labelID: string, gmail: gmail_v1.Gmail) {
	const res = await gmail.users.threads.list({
		userId: 'me',
		labelIds: [labelID],
		maxResults: 100
	});
	return res.data.threads;
}

async function updateLabel(from_labelID: string, to_labelID: string, id: string, gmail: gmail_v1.Gmail) {
	const res = await gmail.users.threads.modify({
		userId: 'me',
		id: id,
		requestBody: {
			addLabelIds: [to_labelID],
			removeLabelIds: [from_labelID]
		},
	});

}

async function mkdirP(path: string) {
	const isExist = await this.app.vault.exists(path)
	if (!isExist) {
		this.app.vault.createFolder(path)
	}
}

async function fetchMails(from_label: string, to_label: string, base_folder: string, gmail: gmail_v1.Gmail) {
	new Notice('Start Fetch Mail');
	await mkdirP(base_folder)
	const fromID = await getLabelIDbyName(from_label, gmail)
	const toID = await getLabelIDbyName(to_label, gmail)
	const threads = await fetchMailList(fromID, gmail) || []
	console.log(threads)
	for (let i = 0; i < threads.length; i++) {
		const id = threads[i].id || ""
		await saveMail(base_folder, gmail, id);
	}
	new Notice('Finished Fetch Mails');
	for (let i = 0; i < threads.length; i++) {
		const id = threads[i].id || ""
		await updateLabel(fromID, toID, id, gmail);
	}
	new Notice('Finished Move Mails');
}




async function loadSavedCredentialsIfExist(settings: MyPluginSettings) {
	console.log(settings)
	const TOKEN_PATH = path.join(settings.credentials_path, '.token.json');
	try {
		const content = await fs.readFile(TOKEN_PATH);
		const credentials = JSON.parse(content);
		return google.auth.fromJSON(credentials);
	} catch (err) {
		return null;
	}
}

// async function saveCredentials(settings: MyPluginSettings) {
// 	const TOKEN_PATH = path.join(settings.credentials_path, '.token.json');
// 	const payload = JSON.stringify({
// 		type: 'authorized_user',
// 		client_id: settings.client_id,
// 		client_secret: settings.client_secret,
// 		refresh_token: settings.gc.authClient.credentials.refresh_token
// 	});
// 	await fs.writeFile(TOKEN_PATH, payload);
// }

async function saveCredentials(client, cred_path, token_path) {
	const content = await fs.readFile(cred_path);
	const keys = JSON.parse(content);
	const key = keys.installed || keys.web;
	const payload = JSON.stringify({
		type: 'authorized_user',
		client_id: key.client_id,
		client_secret: key.client_secret,
		refresh_token: client.credentials.refresh_token,
	});
	console.log("TOKEN:" + token_path)
	const isExist = await this.app.vault.exists(token_path)
	await this.app.vault.create(token_path, payload);
	// await fs.writeFile(token_path, payload);
}


export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'gmail fetch',
			(evt: MouseEvent) => {
				fetchMails(
					this.settings.from_label,
					this.settings.to_label,
					this.settings.mail_folder,
					this.settings.gc.gmail);
			});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');
		this.addCommand({
			id: 'Gmail-Log',
			name: 'Gmail-Log',
			callback: () => {
				console.log(this.settings)
			}
		});
		this.addCommand({
			id: 'Gmail-Fetch',
			name: 'Gmail-Fetch',
			callback: () => {
				listLabels(this.settings.gc.gmail);
			}
		});

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'Gmail-List',
			name: 'Gmail-List',
			callback: () => {
				listLabels(this.settings.gc.gmail);
			}
		});
		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}

	async loadSettings() {
		console.log("load setting")
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		let client = await loadSavedCredentialsIfExist(this.settings) || "";
		if (client !== "") {
			this.settings.gc.authClient = client
			this.settings.gc.gmail = google.gmail({
				version: 'v1',
				auth: client
			})
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}


async function authorize(setting: MyPluginSettings) {
	let client = await loadSavedCredentialsIfExist(setting);
	if (client) {
		return client;
	}
	console.log("PATH=" + setting.cred_path)
	client = await authenticate({
		scopes: SCOPES,
		keyfilePath: setting.cred_path,
	});
	if (client.credentials) {
		await saveCredentials(client, setting.cred_path, setting.token_path);
	}
	return client;
}


function setupGserviceConnection(settings: MyPluginSettings) {
	new Notice("Try to load credential file")
	console.log(settings)
	const gc = settings.gc
	gc.authClient = authorize(settings)
	gc.gmail = google.gmail({
		version: 'v1',
		auth: gc.authClient
	})
	new Notice("Finished Login Setting")
}


class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();
		containerEl.createEl('h2', { text: 'Setup Google OAuth settings' });
		new Setting(containerEl)
			.setName('Credential File')
			.setDesc('Path to credential file')
			.addText(text => text
				.setPlaceholder('Enter the path')
				.setValue(this.plugin.settings.cred_path)
				.onChange(async (value) => {
					this.plugin.settings.cred_path = value;
					await this.plugin.saveSettings();
				})).addButton((cb) => {
					cb.setButtonText("Setup")
						.setCta()
						.onClick(() => {
							setupGserviceConnection(this.plugin.settings)
						});
				});

		new Setting(containerEl)
			.setName('>> Mail from label')
			.setDesc('Labels to fetched from Gmail')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.from_label)
				.onChange(async (value) => {
					this.plugin.settings.from_label = value;
					await this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName('Mail to label >>')
			.setDesc('Labels to fetched from Gmail')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.to_label)
				.onChange(async (value) => {
					this.plugin.settings.to_label = value;
					await this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName('Mail Folder')
			.setDesc('folder to store mail notes')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mail_folder)
				.onChange(async (value) => {
					this.plugin.settings.mail_folder = value;
					await this.plugin.saveSettings();
				}));
	}
}
