import { Notice } from 'obsidian';
import { google } from 'googleapis';
import { listLabels } from 'src/GmailAPI';
const fs = require('fs').promises;
import { authenticate } from '@google-cloud/local-auth';

const SCOPES = [
    'https://www.googleapis.com/auth/gmail.modify'
]
// @ts-ignore
export async function loadSavedCredentialsIfExist(settings: ObsGMailSettings) {
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

// @ts-ignore
async function authorize(setting: ObsGMailSettings) {
    let client = await loadSavedCredentialsIfExist(setting);
    if (client) {
        return client;
    }
    // @ts-ignore
    client = await authenticate({
        scopes: SCOPES,
        keyfilePath: setting.cred_path,
    });
    // @ts-ignore
    if (client.credentials) {
        await saveCredentials(client, setting.cred_path, setting.token_path);
    }
    return client;
}

// @ts-ignore
export async function setupGserviceConnection(settings: ObsGMailSettings) {
    const gc = settings.gc
    gc.authClient = await authorize(settings)
    gc.gmail = google.gmail({
        version: 'v1',
        auth: gc.authClient
    })
    settings.labels = await listLabels(gc.gmail) || [[]]
    new Notice("Finished Login Setting")
}