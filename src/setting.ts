import { Client, setupGserviceConnection } from 'src/GOauth';
import { checkToken, removeToken } from 'src/GOauth';
import { Setting, Modal, Notice, App } from 'obsidian';
import { ObsGMailSettingTab } from 'src/main'
import { GMail } from './GmailAPI';


interface gservice {
	authClient: Client | null;
	gmail: GMail | null;
	scope: Array<string>;
	login: boolean;
}
interface label_set {
	from: string;
	to: string
}

export interface ObsGMailSettings {
	gc: gservice;
	credentials: string;
	from_label: string;
	to_label: string;
	mail_folder: string;
	toFetchAttachment: boolean;
	attachment_folder: string;
	template: string;
	token_path: string;
	labels: Array<Array<string>>;
	mail_account: string;
	fetch_amount: number;
	fetch_interval: number;
	fetch_on_load: boolean;
	destroy_on_fetch: boolean;
	noteName: string;
	prev_labels: label_set;
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
	template: "",
	mail_folder: "fetchedMail",
	toFetchAttachment: false,
	attachment_folder: "fetchedMail/attachments",
	noteName: '${Subject}',
	token_path: "plugins/obsidian-google-mail/.token",
	labels: [[]],
	mail_account: "",
	fetch_amount: 25,
	fetch_interval: 0,
	fetch_on_load: false,
	destroy_on_fetch: false,
	prev_labels: {
		from: "",
		to: ""
	}
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
		const { contentEl } = this;
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
	settings.prev_labels = {from: settings.from_label, to:settings.to_label}
	removeToken(settings.token_path).then(() => {
		settings.mail_account = ""
		settings.from_label = ""
		settings.to_label = ""
		settings.labels = [[]]
		settings.gc.gmail = null
		settings.gc.login = false
		settings.gc.authClient = null
		Tab.plugin.saveSettings();
		Tab.display();
	})
}


export async function draw_settingtab(settingTab: ObsGMailSettingTab) {
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
	if (await checkToken(settings.token_path)) {
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
			.setName('Labels [From/To]')
			.setDesc('Labels to fetch from/ Labels to assign')
			.addDropdown((cb) => { //Add From Label
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
			})
			.addDropdown( //Add to Label
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
			.setDesc('Folder to save mail notes')
			.addText(text => text
				.setPlaceholder('/Folder/')
				.setValue(settings.mail_folder)
				.onChange(async (value) => {
					settings.mail_folder = value;
					await plugin.saveSettings();
				}));
		new Setting(containerEl)
		.setName('to Fetch Attachments')
		.setDesc('Whether to fetch attachments')
		.addToggle(cb=>{
			cb.setValue(settings.toFetchAttachment)
			cb.onChange(async (value) =>{
				settings.toFetchAttachment = value;
				await plugin.saveSettings();
				settingTab.display();
			})
		})
		if(settings.toFetchAttachment){
			new Setting(containerEl)
			.setName('Attachment Folder')
			.setDesc('Folder to save mail attachments')
			.addText(text => text
				.setPlaceholder('/Folder/')
				.setValue(settings.attachment_folder)
				.onChange(async (value) => {
					settings.attachment_folder = value;
					await plugin.saveSettings();
				}));
		}
		new Setting(containerEl)
			.setName('Mail Name')
			.setDesc('File name to save mail notes')
			.addText(text => text
				.setPlaceholder('${Subject}-${Date}')
				.setValue(settings.noteName||'')
				.onChange(async (value) => {
					settings.noteName = value;
					await plugin.saveSettings();
				}))
		new Setting(containerEl)
			.setName('Mail Note Template')
			.setDesc("Please check document for available mail attributes")
			.addText(text => text
				.setPlaceholder('/Folder/template.md')
				.setValue(settings.template)
				.onChange(async (value) => {
					settings.template = value;
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
			.setName('Fetch Interval')
			.setDesc('Fetch Interval in minutes, 0 disables automatic fetch.')
			.addText(text => text
				.setPlaceholder('default is 0 disabled')
				.setValue(String(settings.fetch_interval))
				.onChange(async (value) => {
					const parsed = parseInt(value);
					if (isNaN(parsed)) return;
					// Normalize negative numbers to zero
					settings.fetch_interval = parsed > 0 ? parsed : 0;
					await plugin.saveSettings();
					await plugin.setTimer();
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
		new Setting(containerEl)
			.setName('☢️ Destroy on Fetch')
			.setDesc('Turn on to delete email after fetch')
			.addToggle((cb) => {
				cb.setValue(settings.destroy_on_fetch)
				cb.onChange(async (value) => {
					settings.destroy_on_fetch = value
					await plugin.saveSettings();
				})

			})
		new Setting(containerEl)
			.setName('Validation')
			.setDesc('Help you validate settins')
			.addButton((cb) => {
				cb.setCta();
				cb.setIcon('checkmark');
				cb.onClick(async (cb) => {
					let checked = true;
					if (!await this.app.vault.exists(settings.template)) {
						new Notice('Template file not exists.');
						settings.template = "";
						checked = false;
					}
					if (settings.from_label == settings.to_label) {
						new Notice('From and To labels can not be the same.')
						let idx = 0
						for (let i = 0; i < settings.labels.length; i++) {
							if (settings.labels[i][0] == settings.from_label) {
								idx = i + 1;
								break;
							}
						}
						if (idx == settings.labels.length - 1)
							idx = 0;
						settings.to_label = settings.labels[idx][0];
						checked = false;
					}
					if (checked) {
						new Notice('All Clear!')
					}
					await plugin.saveSettings();
					settingTab.display();
				})
			})
	}
}
