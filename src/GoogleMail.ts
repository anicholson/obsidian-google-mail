import { App, request, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { google, gmail_v1, chat_v1 } from 'googleapis';
const { authenticate } = require('@google-cloud/local-auth');
const fs = require('fs').promises;
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
	labels: Array<Array<string>>;
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
	token_path: "/.obsidian/.token.json",
	labels: [[]]
}


async function listLabels(gmail: gmail_v1.Gmail) {

	const res = await gmail.users.labels.list({
		userId: 'me'
	});
	const labels = res.data.labels;
	if (!labels || labels.length === 0) {
		console.log('No labels found.');
		return;
	}
	let label_list = Array<Array<string>>();
	labels.forEach((label) => {
		label_list.push([String(label.name), String(label.id)])
	});
	return label_list;
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
	// console.log(res.data.messages)
	const raw = ((res.data.messages || [])[0].payload?.parts || [])[0].body?.data || ""
	return base64ToUTF8(raw)
}

function replaceInMailLink(text: string) {
	const regex = /(\S*) (\(https:\/\/[^)]*\))/gm;
	return text.replace(regex, `[$1]$2`)
}

function blank(text: string): boolean {
	return text === undefined || text === null || text === "";
}

function notBlank(text: string): boolean {
	return !blank(text);
}
async function GetPageTitle(url: string): Promise<string> {
	try {
		const html = await request({ url });

		const doc = new DOMParser().parseFromString(html, "text/html");
		const title = doc.querySelectorAll("title")[0];

		if (title == null || blank(title?.innerText)) {
			// If site is javascript based and has a no-title attribute when unloaded, use it.
			var noTitle = title?.getAttr("no-title");
			if (notBlank(noTitle)) {
				return noTitle;
			}

			// Otherwise if the site has no title/requires javascript simply return Title Unknown
			return url;
		}

		return title.innerText;
	} catch (ex) {
		console.error(ex);

		return "Site Unreachable";
	}
}

async function fetchUrlTitle(url: string): Promise<string> {
	try {
		const title = await GetPageTitle(url);
		return title.replace(/(\r\n|\n|\r)/gm, "").trim();
	} catch (error) {
		// console.error(error)
		return "Site Unreachable";
	}
}

async function replaceAsync(str, regex, asyncFn) {
	const promises = [];
	str.replace(regex, (match, ...args) => {
		const promise = asyncFn(match, ...args);
		promises.push(promise);
	});
	const data = await Promise.all(promises);
	return str.replace(regex, () => data.shift());
}

async function uriToTitleURI(url: string): Promise<string> {
	url = url.trim()
	const title = await GetPageTitle(url);
	return `[${title}](${url})`
}

async function retriveURITitle(text: string) {
	const regex = /[^(](http.*)[^)]/gm;
	return replaceAsync(text, regex, uriToTitleURI)
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
		isExist = await this.app.vault.exists(folder + "/" + `${tmp}.md`)
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
	console.log("Get staus: " + res.status);
	const title_candidates = ((res.data.messages || [])[0].payload?.headers || [])
	let title = findTitle(title_candidates)
	title = formatTitle(title)
	title = await incr_filename(title, folder)
	// const TOKEN_PATH = path.join(folder, `${ title }.md`);
	let txt = getMailPlainText(res);
	txt = replaceInMailLink(txt)
	txt = await retriveURITitle(txt)
	txt = appendPrefix("tags:: #captured\n", txt)
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

async function fetchMails(fromID: string, toID: string, base_folder: string, gmail: gmail_v1.Gmail) {
	new Notice('Start Fetch Mail');
	await mkdirP(base_folder)
	const threads = await fetchMailList(fromID, gmail) || []
	console.log(threads);
	for (let i = 0; i < threads.length; i++) {
		if (i % 10 == 0)
			new Notice(`Fetching Mail ${i} /${threads.length}`);
		const id = threads[i].id || ""
		await saveMail(base_folder, gmail, id);
		await updateLabel(fromID, toID, id, gmail);
	}
	new Notice('End Fetch Mail');
}




async function loadSavedCredentialsIfExist(settings: MyPluginSettings) {
	try {
		const content = await this.app.vault.readJson(settings.token_path);
		return google.auth.fromJSON(content);
	} catch (err) {
		return null;
	}
}

async function saveCredentials(client: any, cred_path: string, token_path: string) {
	const content = await fs.readFile(cred_path);
	const keys = JSON.parse(content);
	const key = keys.installed || keys.web;
	const payload = JSON.stringify({
		type: 'authorized_user',
		client_id: key.client_id,
		client_secret: key.client_secret,
		refresh_token: client.credentials.refresh_token,
	});
	// console.log("TOKEN:" + token_path)
	const isExist = await this.app.vault.exists(token_path)
	if (!isExist)
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
				listLabels(this.settings.gc.gmail).then((labels: string[][]) => {
					console.log(labels);
				})
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));
	}

	onunload() {

	}

	async loadSettings() {
		// console.log("load setting")
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
	client = await authenticate({
		scopes: SCOPES,
		keyfilePath: setting.cred_path,
	});
	if (client.credentials) {
		await saveCredentials(client, setting.cred_path, setting.token_path);
	}
	return client;
}


async function setupGserviceConnection(settings: MyPluginSettings) {
	// new Notice("Try to load credential file")
	// console.log(settings)
	const gc = settings.gc
	gc.authClient = await authorize(settings)
	gc.gmail = google.gmail({
		version: 'v1',
		auth: gc.authClient
	})
	settings.labels = await listLabels(gc.gmail) || [[]]
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
							setupGserviceConnection(this.plugin.settings).then(() => { this.display(); })
						});
				});

		new Setting(containerEl)
			.setName('>> Mail from label')
			.setDesc('Labels to fetched from Gmail').addDropdown(
				(cb) => {
					if (this.plugin.settings.labels.length > 0)
						this.plugin.settings.labels.forEach((label) => {
							cb.addOption(label[1], label[0])
						})
					if (this.plugin.settings.from_label)
						cb.setValue(this.plugin.settings.from_label)
					cb.onChange(async (value) => {
						this.plugin.settings.from_label = value;
						await this.plugin.saveSettings();
					})
				}
			)
		new Setting(containerEl)
			.setName('Mail to label >>')
			.setDesc('Labels to fetched from Gmail').addDropdown(
				(cb) => {
					if (this.plugin.settings.labels.length > 0)
						this.plugin.settings.labels.forEach((label) => {
							cb.addOption(label[1], label[0]);
						})
					if (this.plugin.settings.to_label)
						cb.setValue(this.plugin.settings.to_label)
					cb.onChange(async (value) => {
						this.plugin.settings.to_label = value;
						await this.plugin.saveSettings();
					})
				}
			)
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
