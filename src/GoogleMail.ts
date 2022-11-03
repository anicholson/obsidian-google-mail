import { App, request, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

import { fetchMailAction } from 'src/GmailAPI';
import { draw_settingtab, ObsGMailSettings, DEFAULT_SETTINGS } from 'src/setting';



export default class ObsGMail extends Plugin {
	settings: ObsGMailSettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('sheets-in-box', 'gmail fetch',
			(evt: MouseEvent) => {
				fetchMailAction(this.settings);
			});

		// Perform additional things with the ribbon
		ribbonIconEl.addClass('GoogleMail-ribbon-class');
		this.addCommand({
			id: 'Gmail-Fetch',
			name: 'Gmail-Fetch',
			callback: () => {
				fetchMailAction(this.settings);
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new ObsGMailSettingTab(this.app, this));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
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