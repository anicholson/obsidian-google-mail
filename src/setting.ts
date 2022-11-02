import { setupGserviceConnection } from 'src/GOauth';

import { Setting } from 'obsidian';
// @ts-ignore
export function draw_settingtab(settingTab) {
	const plugin = settingTab.plugin;
	const { containerEl } = settingTab;
	containerEl.empty();
	containerEl.createEl('h2', { text: 'Setup Google OAuth settings' });
	new Setting(containerEl)
		.setName('Credential Content')
		.setDesc('The content from credential file (*.json)')
		.addText(text => text
			.setPlaceholder('Just copy and paste')
			.setValue(plugin.settings.credentials)
			.onChange(async (value) => {
				plugin.settings.credentials = value;
				await plugin.saveSettings();
			})).addButton((cb) => {
				cb.setButtonText("Setup")
					.setCta()
					.onClick(() => {
						setupGserviceConnection(plugin.settings).then(() => { settingTab.display(); })
					});
			});

	new Setting(containerEl)
		.setName("Gmail Account")
		.setDesc('email account to fetch mails')
		.addText(text => text
			.setValue(plugin.settings.mail_account)
			.setDisabled(true)
		);
	// .onChange(async (value) => {
	// 	plugin.settings.mail_account = value;
	// 	await plugin.saveSettings();
	// })

	new Setting(containerEl)
		.setName('>> Mail from label')
		.setDesc('Labels to fetched from Gmail').addDropdown(
			(cb) => {
				if (plugin.settings.labels.length > 0)
					// @ts-ignore
					plugin.settings.labels.forEach((label) => {
						cb.addOption(label[1], label[0])
					})
				if (plugin.settings.from_label)
					cb.setValue(plugin.settings.from_label)
				cb.onChange(async (value) => {
					plugin.settings.from_label = value;
					await plugin.saveSettings();
				})
			}
		)
	new Setting(containerEl)
		.setName('Mail to label >>')
		.setDesc('Labels to fetched from Gmail').addDropdown(
			(cb) => {
				if (plugin.settings.labels.length > 0)
					// @ts-ignore
					plugin.settings.labels.forEach((label) => {
						cb.addOption(label[1], label[0]);
					})
				if (plugin.settings.to_label)
					cb.setValue(plugin.settings.to_label)
				cb.onChange(async (value) => {
					plugin.settings.to_label = value;
					await plugin.saveSettings();
				})
			}
		)
	new Setting(containerEl)
		.setName('Mail Folder')
		.setDesc('folder to store mail notes')
		.addText(text => text
			.setPlaceholder('Relative path in vault')
			.setValue(plugin.settings.mail_folder)
			.onChange(async (value) => {
				plugin.settings.mail_folder = value;
				await plugin.saveSettings();
			}));
}