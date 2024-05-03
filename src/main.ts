import { App, Plugin, PluginSettingTab } from 'obsidian';

import { fetchMailAction } from 'src/GmailAPI';
import { draw_settingtab, ObsGMailSettings, DEFAULT_SETTINGS } from 'src/setting';



export default class ObsGMail extends Plugin {
	settings: ObsGMailSettings;
	timerID: ReturnType<typeof setInterval>;

	async onload() {
		await this.loadSettings();

		if (this.settings.fetch_on_load)
			fetchMailAction(this.settings)

		this.setTimer()

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
		this.cancelTimer()
	}

	private async cancelTimer() {
		try {
			clearInterval(this.timerID)
		}
		catch {
			console.log('Unable to cancel fetch timer id: ' + this.timerID)
		}
	}

	async setTimer() {

		if (isNaN(this.settings.fetch_interval) || this.settings.fetch_interval < 0) {
			return
		}

		await this.cancelTimer()
		const msInterval = this.settings.fetch_interval * 60000
		// Set new timer if interval more than zero is requested
		if (msInterval > 0) {
			this.timerID = setInterval(() => {
				fetchMailAction(this.settings)
			}, msInterval)
		}
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
