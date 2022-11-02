import { Notice } from 'obsidian';
import { google } from 'googleapis';
import { listLabels, getMailAccount } from 'src/GmailAPI';
const http = require('http');
const url = require('url');
const opn = require('open');
const destroyer = require('server-destroy');

const SCOPES = [
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/userinfo.email'
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

async function saveCredentials(client: any, credentials: string, token_path: string) {
    const keys = JSON.parse(credentials);
    const key = keys.installed || keys.web;
    const payload = JSON.stringify({
        type: 'authorized_user',
        client_id: key.client_id,
        client_secret: key.client_secret,
        refresh_token: client.credentials.refresh_token,
    });
    // console.log("TOKEN:" + token_path)
    await this.app.vault.writeJson(token_path, payload)
    // await fs.writeFile(token_path, payload);

}

function getPortFromURI(uri: string): number {
    const mat = uri.match(/:(?<port>[0-9]+)/m) || []
    console.log(mat[1])
    return Number(mat[1])
}

async function my_authenticate(scopes: Array<string>, credentials: string) {
    const keys = JSON.parse(credentials).web
    console.log(keys)
    const oauth2Client = new google.auth.OAuth2(
        keys.client_id,
        keys.client_secret,
        keys.redirect_uris[0]
    );
    const redirect_uri = keys.redirect_uris[0]
    const ListenPort = getPortFromURI(redirect_uri)
    return new Promise((resolve, reject) => {
        // grab the url that will be used for authorization
        const authorizeUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes.join(' '),
        });
        const server = http
            .createServer(async (req: any, res: any) => {
                try {
                    if (req.url.indexOf('/oauth2callback') > -1) {
                        const qs = new url.URL(req.url, redirect_uri)
                            .searchParams;
                        res.end('Authentication successful! \n You can close the page now');
                        server.destroy();
                        const { tokens } = await oauth2Client.getToken(qs.get('code'));
                        oauth2Client.credentials = tokens; // eslint-disable-line require-atomic-updates
                        resolve(oauth2Client);
                    }
                } catch (e) {
                    reject(e);
                }
            })
            .listen(ListenPort, () => {
                // open the browser to the authorize url to start the workflow
                opn(authorizeUrl, { wait: false }).then((cp: any) => cp.unref());
            });
        destroyer(server);
    });
}

// @ts-ignore
async function authorize(setting: ObsGMailSettings) {
    let client = await loadSavedCredentialsIfExist(setting);
    if (client) {
        return client;
    }
    // @ts-ignore
    client = await my_authenticate(SCOPES, setting.credentials)
    console.log(client);
    // @ts-ignore
    if (client.credentials) {
        await saveCredentials(client, setting.credentials, setting.token_path);
    }
    return client;
}

// @ts-ignore
export async function setupGserviceConnection(settings: ObsGMailSettings) {
    // const cred_path = "/.obsidian/plugins/obsidian-google-mail/.cred.json"
    // const keys = JSON.parse(settings.credentials);
    // const key = keys.installed || keys.web;
    // await this.app.vault.writeJson(cred_path, key)
    const gc = settings.gc
    gc.authClient = await authorize(settings)
    gc.gmail = google.gmail({
        version: 'v1',
        auth: gc.authClient
    })
    settings.mail_account = await getMailAccount(gc.gmail)
    settings.labels = await listLabels(settings.mail_account, gc.gmail) || [[]]
    new Notice("Finished Login Setting")
}