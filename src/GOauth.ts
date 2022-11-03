import { Notice } from 'obsidian';
import { google } from 'googleapis';
import { listLabels, getMailAccount, createGmailConnect } from 'src/GmailAPI';
import { ObsGMailSettings } from 'src/setting';
const http = require('http');
const url = require('url');
const opn = require('open');
const destroyer = require('server-destroy');
let server_ = http.createServer()

const SCOPES = [
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/userinfo.email'
]
export async function loadSavedCredentialsIfExist(settings: ObsGMailSettings) {
    try {
        const content = await this.app.vault.readConfigJson(settings.token_path);
        return google.auth.fromJSON(content);
    } catch (err) {
        console.log(err)
        return null;
    }
}
export async function removeToken(path: string) {
    // console.log("remove toke")
    if (await checkToken(path)) {
        // console.log("try remove")
        // console.log(path)
        await this.app.vault.deleteConfigJson(path);
    }
}
export async function checkToken(path: string) {
    path = '/.obsidian/' + path + '.json';
    // console.log("check:" + path)
    if (await this.app.vault.exists(path)) {
        return true;
    }
    return false;
}

async function saveCredentials(client: any, credentials: any, token_path: string) {
    // console.log(client.credentials)
    const keys = JSON.parse(credentials);
    const key = keys.installed || keys.web;
    const payload = {
        type: 'authorized_user',
        client_id: key.client_id,
        client_secret: key.client_secret,
        refresh_token: client.credentials.refresh_token
    };
    await this.app.vault.writeConfigJson(token_path, payload)
}

function getPortFromURI(uri: string): number {
    const mat = uri.match(/:(?<port>[0-9]+)/m) || []
    // console.log(mat[1])
    return Number(mat[1])
}

async function my_authenticate(scopes: Array<string>, credentials: string) {
    const keys = JSON.parse(credentials).web
    // console.log(keys)
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
            prompt: "consent"
        });
        if (server_.listening) {
            console.log("Sercer is listening on port, Destroy before create")
            server_.destroy();
        }
        server_ = http
            .createServer(async (req: any, res: any) => {
                try {
                    if (req.url.indexOf('/oauth2callback') > -1) {
                        const qs = new url.URL(req.url, redirect_uri)
                            .searchParams;
                        res.end("Authorization successed. You can close this window.");
                        server_.destroy();
                        const { tokens } = await oauth2Client.getToken(qs.get('code'));
                        oauth2Client.credentials = tokens; // eslint-disable-line require-atomic-updates
                        resolve(oauth2Client);
                    }
                } catch (e) {
                    reject(e);
                }
            });

        server_.listen(ListenPort, () => {
            // open the browser to the authorize url to start the workflow
            opn(authorizeUrl, { wait: false }).then((cp: any) => cp.unref());
        });
        destroyer(server_);
    });
}

export async function authorize(setting: ObsGMailSettings) {
    let client = await loadSavedCredentialsIfExist(setting);
    if (!client) {
        // @ts-ignore
        // console.log("token failed")
        client = await my_authenticate(SCOPES, setting.credentials)
        if (server_.listening)
            server_.destroy();
    }
    // @ts-ignore
    if (client.credentials) {
        // console.log("Login Success")
        await saveCredentials(client, setting.credentials, setting.token_path);
        setting.gc.authClient = client
        setting.gc.gmail = createGmailConnect(client);
        setting.gc.login = true;
    }
    else {
        new Notice('Login Failed')
    }
}

// @ts-ignore
export async function setupGserviceConnection(settings: ObsGMailSettings) {
    // console.log(settings)
    const gc = settings.gc
    await authorize(settings);
    // gc.authClient = await authorize(settings)
    // gc.gmail = google.gmail({
    //     version: 'v1',
    //     auth: gc.authClient
    // })
    if (settings.gc.login) {
        settings.mail_account = await getMailAccount(gc.gmail);
        settings.labels = await listLabels(settings.mail_account, gc.gmail) || [[]];
        return true;
    }
    else
        return false;
}