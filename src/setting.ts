import { setupGserviceConnection } from 'src/GOauth';

import { Setting } from 'obsidian';
export function draw_settingtab(settingTab) {
	const plugin = settingTab.plugin;
	const { containerEl } = settingTab;
	containerEl.empty();
	containerEl.createEl('h2', { text: 'Setup Google OAuth settings' });
	new Setting(containerEl)
		.setName('Path of Credential File')
		.setDesc('Absolut Path to credential file, the file can be placed outside of vault. But addtional permission is required. (on macOS)')
		.addText(text => text
			.setPlaceholder('Enter the path')
			.setValue(plugin.settings.cred_path)
			.onChange(async (value) => {
				plugin.settings.cred_path = value;
				await plugin.saveSettings();
			})).addButton((cb) => {
				cb.setButtonText("Setup")
					.setCta()
					.onClick(() => {
						setupGserviceConnection(plugin.settings).then(() => { settingTab.display(); })
					});
			});

	new Setting(containerEl)
		.setName('>> Mail from label')
		.setDesc('Labels to fetched from Gmail').addDropdown(
			(cb) => {
				if (plugin.settings.labels.length > 0)
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