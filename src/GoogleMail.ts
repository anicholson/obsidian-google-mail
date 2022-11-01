import { App, request, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

import { fetchMails, listLabels, createGmailConnect } from 'src/GmailAPI';
import { loadSavedCredentialsIfExist, setupGserviceConnection } from 'src/GOauth';
import { draw_settingtab } from 'src/setting';




interface gservice {
	authClient: any;
	gmail: any;
	scope: Array<string>;
	refresh_token: string
}

interface ObsGMailSettings {
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

const DEFAULT_SETTINGS: ObsGMailSettings = {
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


export default class ObsGMail extends Plugin {
	settings: ObsGMailSettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('sheets-in-box', 'gmail fetch',
			(evt: MouseEvent) => {
				fetchMails(
					this.settings.from_label,
					this.settings.to_label,
					this.settings.mail_folder,
					this.settings.gc.gmail);
			});

		// Perform additional things with the ribbon
		ribbonIconEl.addClass('GoogleMail-ribbon-class');
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
		this.addSettingTab(new ObsGMailSettingTab(this.app, this));
	}

	onunload() {

	}

	async loadSettings() {
		// console.log("load setting")
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		let client = await loadSavedCredentialsIfExist(this.settings) || "";
		if (client !== "") {
			this.settings.gc.authClient = client
			this.settings.gc.gmail = createGmailConnect(client);
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

export class ObsGMailSettingTab extends PluginSettingTab {
	plugin: ObsGMail;

	constructor(app: App, plugin: ObsGMail) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		draw_settingtab(this)
	}
}