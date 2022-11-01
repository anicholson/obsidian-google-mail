import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { google, authenticate } from 'googleapis';
// import { authenticate } from '@google-cloud/local-auth';
const http = require('http');
const url = require('url');
const opn = require('open');
const destroyer = require('server-destroy');
const gmail = google.gmail('v1');

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

const oauth2Client = new google.auth.OAuth2(
	'279747116549-fmun5sm7q8qvqd3qpk0onrhu464vjo0n.apps.googleusercontent.com',
	'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',
	'http://localhost:9999/oauth2callback'
);
google.options({ auth: oauth2Client });

const scopes = [
	'https://www.googleapis.com/auth/gmail.readonly'
];
/**
 * Open an http server to accept the oauth callback. In this simple example, the only request to our webserver is to /callback?code=<code>
 */
async function authenticate() {

	return new Promise((resolve, reject) => {
		// grab the url that will be used for authorization
		const authorizeUrl = oauth2Client.generateAuthUrl({
			access_type: 'offline',
			scope: scopes.join(' '),
		});
		const server = http
			.createServer(async (req, res) => {
				try {
					if (req.url.indexOf('/oauth2callback') > -1) {
						const qs = new url.URL(req.url, 'http://localhost:9999')
							.searchParams;
						res.end('Authentication successful! Please return to the console.');
						server.destroy();
						const { tokens } = await oauth2Client.getToken(qs.get('code'));
						oauth2Client.credentials = tokens; // eslint-disable-line require-atomic-updates
						resolve(oauth2Client);
						// return oauth2Client
					}
				} catch (e) {
					reject(e);
				}
			})
			.listen(9999, () => {
				// open the browser to the authorize url to start the workflow
				opn(authorizeUrl, { wait: false }).then(cp => cp.unref());
			});
		destroyer(server);
	});
}

async function authorize() {
	if (!oauth2Client.credentials.refresh_token)
		return authenticate()
}

async function runSample() {
	// retrieve user profile
	console.log("runSample")
	console.log(oauth2Client)
	const res = await gmail.users.labels.list({
		userId: 'me'
	});
	console.log(res.data);
}


async function gmailFetch() {
	console.log(oauth2Client)
	console.log('Trigger');
	authorize().then(runSample).catch(console.error)
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'gmail fetch',
			(evt: MouseEvent) => {
				new Notice('GM');
				gmailFetch();
			});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'Gmail-Fetch',
			name: 'Gmail-Fetch',
			callback: () => {
				gmailFetch()
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
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
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
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

		containerEl.createEl('h2', { text: 'Settings for my awesome plugin.' });

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					console.log('Secret: ' + value);
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
