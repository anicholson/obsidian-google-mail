import { Notice } from "obsidian";
//import { google } from 'googleapis';
import { listLabels, getMailAccount, createGmailConnect } from "src/GmailAPI";
import { ObsGMailSettings } from "src/setting";
import http from "http";
import url from "url";
import opn from "open";
import destroyer from "server-destroy";
import { auth } from "google-auth-library";
import { JSONClient } from "google-auth-library/build/src/auth/googleauth";
import { OAuth2Client } from "google-auth-library/build/src/auth/oauth2client";
import { assertPresent } from "./typeHelpers";
let server_ = http.createServer();

export type Client = JSONClient | OAuth2Client;

const SCOPES = [
	"https://mail.google.com/",
	"https://www.googleapis.com/auth/gmail.modify",
	"https://www.googleapis.com/auth/userinfo.email",
];
export async function loadSavedCredentialsIfExist(settings: ObsGMailSettings) {
	try {
		const content = await this.app.vault.readConfigJson(settings.token_path);
		return auth.fromJSON(content);
	} catch (err) {
		return null;
	}
}
export async function removeToken(path: string) {
	if (await checkToken(path)) {
		await this.app.vault.deleteConfigJson(path);
	}
}
export async function checkToken(path: string) {
	path = "/.obsidian/" + path + ".json";
	if (await this.app.vault.exists(path)) {
		return true;
	}
	return false;
}

async function saveCredentials(
	client: Client,
	credentials: string,
	token_path: string,
) {
	const keys = JSON.parse(credentials);
	const key = keys.installed || keys.web;
	const payload = {
		type: "authorized_user",
		client_id: key.client_id,
		client_secret: key.client_secret,
		refresh_token: client.credentials.refresh_token,
	};
	await this.app.vault.writeConfigJson(token_path, payload);
}

function getPortFromURI(uri: string): number {
	const mat = uri.match(/:(?<port>[0-9]+)/m) || [];
	return Number(mat[1]);
}

async function my_authenticate(
	scopes: Array<string>,
	credentials: string,
): Promise<OAuth2Client> {
	const keys = JSON.parse(credentials).web;
	const oauth2Client = new OAuth2Client(
		keys.client_id,
		keys.client_secret,
		keys.redirect_uris[0],
	);
	const redirect_uri = keys.redirect_uris[0];
	const ListenPort = getPortFromURI(redirect_uri);
	return new Promise((resolve, reject) => {
		// grab the url that will be used for authorization
		const authorizeUrl = oauth2Client.generateAuthUrl({
			access_type: "offline",
			scope: scopes.join(" "),
			prompt: "consent",
		});
		if (server_.listening) {
			console.log("Server is listening on port, Destroy before create");
			server_.destroy();
		}
		server_ = http.createServer(async (req, res) => {
			try {
				if (req.url && req.url.indexOf("/oauth2callback") > -1) {
					const qs = new url.URL(req.url, redirect_uri).searchParams;
					res.end("Authorization successed. You can close this window.");
					server_.destroy();
					const code = qs.get("code");
					assertPresent(code, "Could not get token code");
					const { tokens } = await oauth2Client.getToken(code);
					oauth2Client.credentials = tokens; // eslint-disable-line require-atomic-updates
					resolve(oauth2Client);
				}
			} catch (e) {
				reject(e);
			}
		});

		server_.listen(ListenPort, () => {
			// open the browser to the authorize url to start the workflow
			opn(authorizeUrl, { wait: false }).then((cp) => cp.unref());
		});
		destroyer(server_);
	});
}

export async function authorize(setting: ObsGMailSettings) {
	let client: Client | null = await loadSavedCredentialsIfExist(setting);
	if (!client) {
		// @ts-ignore
		client = await my_authenticate(SCOPES, setting.credentials);
		if (server_.listening) server_.destroy();
	}
	// @ts-ignore
	if (client.credentials) {
		await saveCredentials(client, setting.credentials, setting.token_path);
		setting.gc.authClient = client;
		setting.gc.gmail = createGmailConnect(client);
		setting.gc.login = true;
	} else {
		new Notice("GMail: Login Failed");
	}
}

function tryRestore(setting: ObsGMailSettings) {
	const prev_from = setting.prev_labels.from;
	const prev_to = setting.prev_labels.to;
	setting.labels.forEach((nlabel) => {
		if (prev_from == nlabel[1]) setting.from_label = prev_from;
		if (prev_to == nlabel[1]) setting.to_label = prev_to;
	});
}

// @ts-ignore
export async function setupGserviceConnection(settings: ObsGMailSettings) {
	// console.log(settings)
	const gc = settings.gc;
	await authorize(settings);
	// gc.authClient = await authorize(settings)
	// gc.gmail = google.gmail({
	//     version: 'v1',
	//     auth: gc.authClient
	// })
	if (settings.gc.login) {
		assertPresent(gc.gmail, "Gmail is not setup properly");
		settings.mail_account = await getMailAccount(gc.gmail);
		settings.labels = (await listLabels(settings.mail_account, gc.gmail)) || [
			[],
		];
		tryRestore(settings);
		return true;
	} else return false;
}
