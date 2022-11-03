import { setupGserviceConnection } from 'src/GOauth';
import { checkToken, removeToken } from 'src/GOauth';
import { Setting, Modal, Notice, App } from 'obsidian';
import { ObsGMailSettingTab } from 'src/GoogleMail'


interface gservice {
	authClient: any;
	gmail: any;
	scope: Array<string>;
	login: boolean;
}

export interface ObsGMailSettings {
	gc: gservice
	credentials: string;
	from_label: string;
	to_label: string;
	mail_folder: string;
	token_path: string;
	labels: Array<Array<string>>;
	mail_account: string;
	fetch_amount: number;
	fetch_on_load: boolean;
}

export const DEFAULT_SETTINGS: ObsGMailSettings = {
	gc: {
		authClient: null,
		gmail: null,
		scope: [],
		login: false,
	},
	credentials: "",
	from_label: "",
	to_label: "",
	mail_folder: "fetchedMail",
	token_path: "plugins/obsidian-google-mail/.token",
	labels: [[]],
	mail_account: "",
	fetch_amount: 25,
	fetch_on_load: false
}

export class ExampleModal extends Modal {
	result: string;
	settings: ObsGMailSettings
	settingTab: ObsGMailSettingTab
	onSubmit: (result: string) => void;
	constructor(app: App, settingTab: ObsGMailSettingTab, onSubmit: (result: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
		this.settingTab = settingTab;
		this.settings = settingTab.plugin.settings;
	}

	onOpen() {
		const { contentEl } = this;

		contentEl.createEl("h1", { text: "Paste Credential Content" });
		this.result = this.settings.credentials;
		new Setting(contentEl)
			.setName("Credential Content")
			.addText((text) =>
				text.setValue(this.settings.credentials)
					.onChange(async (value) => {
						this.result = value;
						this.settings.credentials = value;
						await this.settingTab.plugin.saveSettings();
					}));
		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("Submit")
					.setCta()
					.onClick(() => {
						this.close();
						this.onSubmit(this.result);
					}));
	}

	async onClose() {
		let { contentEl } = this;
		contentEl.empty();
		if (this.result) {
			if (await setupGserviceConnection(this.settings)) {
				new Notice('Successful Logined');
				await this.settingTab.plugin.saveSettings();
				this.settingTab.display();
			}
			else {
				await logout(this.settings, this.settingTab);
			}
		}
		else
			new Notice('No credentials obtained')
	}
}


async function logout(settings: ObsGMailSettings, Tab: ObsGMailSettingTab) {
	removeToken(settings.token_path).then(() => {
		settings.mail_account = ""
		settings.from_label = ""
		settings.to_label = ""
		settings.labels = [[]]
		settings.gc.gmail = null
		settings.gc.login = false
		settings.gc.authClient = null
		// console.log(settings)
		Tab.plugin.saveSettings();
		Tab.display();
	})
}

// @ts-ignore
export function draw_settingtab(settingTab) {
	const plugin = settingTab.plugin;
	const { containerEl } = settingTab;
	const settings = plugin.settings;
	containerEl.empty();
	containerEl.createEl('h2', { text: 'Setup Google OAuth' });
	const profile_section = new Setting(containerEl)
		.setName('Credential Content')
		.setDesc('The content from credential file (*.json)');
	profile_section.addButton((cb) => {
		cb.setButtonText("Setup")
			.setCta()
			.onClick(() => {
				new ExampleModal(this.app, settingTab,
					(result) => { }).open()
			});
	});

	// Only Render the following sections when user is logined
	if (async () => { checkToken(settings) }) {
		profile_section.addButton((cb) => {
			cb.setButtonText("logout")
				.setCta()
				.onClick(async () => {
					await logout(settings, settingTab);
				});
		});

		containerEl.createEl('h2', { text: 'EMail Fetch Settings' });
		new Setting(containerEl)
			.setName('Email Account')
			.addText(text => text
				.setValue(settings.mail_account)
				.setDisabled(true)
			);
		new Setting(containerEl)
			.setName('>> Mail from label')
			.setDesc('Labels to fetched from Gmail').addDropdown(
				(cb) => {
					if (settings.labels.length > 0)
						// @ts-ignore
						settings.labels.forEach((label) => {
							cb.addOption(label[1], label[0])
						})
					if (settings.from_label)
						cb.setValue(settings.from_label)
					cb.onChange(async (value) => {
						settings.from_label = value;
						await plugin.saveSettings();
					})
				}
			)
		new Setting(containerEl)
			.setName('Mail to label >>')
			.setDesc('Labels to fetched from Gmail').addDropdown(
				(cb) => {
					if (settings.labels.length > 0)
						// @ts-ignore
						settings.labels.forEach((label) => {
							cb.addOption(label[1], label[0]);
						})
					if (settings.to_label)
						cb.setValue(settings.to_label)
					cb.onChange(async (value) => {
						settings.to_label = value;
						await plugin.saveSettings();
					})
				}
			)
		new Setting(containerEl)
			.setName('Mail Folder')
			.setDesc('folder to store mail notes')
			.addText(text => text
				.setPlaceholder('Relative path in vault')
				.setValue(settings.mail_folder)
				.onChange(async (value) => {
					settings.mail_folder = value;
					await plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName('Fetch Amount')
			.setDesc('How many email to fetch per action')
			.addText(text => text
				.setPlaceholder('default is 25')
				.setValue(String(settings.fetch_amount))
				.onChange(async (value) => {
					settings.fetch_amount = parseInt(value);
					await plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName('Fetch on load')
			.setDesc('Whether to run fetch on Obsidian Start')
			.addToggle((cb) => {
				cb.setValue(settings.fetch_on_load)
				cb.onChange(async (value) => {
					settings.fetch_on_load = value
					await plugin.saveSettings();
				})

			})
	}
}