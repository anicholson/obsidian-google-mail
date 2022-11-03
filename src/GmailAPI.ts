import { Notice } from 'obsidian';
import { google, gmail_v1 } from 'googleapis';
import { getMailTitle, processMailBody, incr_filename, appendPrefix } from 'src/mailProcess';
import { ObsGMailSettings } from 'src/setting';
import { authorize } from 'src/GOauth';
// @ts-ignore
export function createGmailConnect(client) {
    return google.gmail({
        version: 'v1',
        auth: client
    })
}


export async function fetchMailAction(settings: ObsGMailSettings) {
    // console.log("Start Fetch")
    // console.log(settings)
    if (settings.gc.gmail) {
        // console.log("gmail instance exist");
        await authorize(settings).then(() => {
            fetchMails(
                settings.mail_account,
                settings.from_label,
                settings.to_label,
                settings.mail_folder,
                settings.fetch_amount,
                settings.gc.gmail);
        })
    }
    else {
        new Notice('Gmail: Please Setup first')
    }
}

export async function getMailAccount(gmail: gmail_v1.Gmail) {
    const res = await gmail.users.getProfile({
        userId: 'me'
    });
    const mail_address = res.data.emailAddress;
    return mail_address || "";
}


export async function listLabels(account: string, gmail: gmail_v1.Gmail) {

    const res = await gmail.users.labels.list({
        userId: account
    });
    const labels = res.data.labels;
    if (!labels || labels.length === 0) {
        console.log('No labels found.');
        return;
    }
    let label_list = Array<Array<string>>();
    labels.forEach((label) => {
        label_list.push([String(label.name), String(label.id)])
    });
    return label_list;
}

async function getLabelIDbyName(name: string, gmail: gmail_v1.Gmail) {
    const res = await gmail.users.labels.list({
        userId: 'me'
    });
    const labels = res.data.labels || [];
    let result_id = ""
    labels.forEach((label) => {
        if (label.name === name) { result_id = label.id || "" }
    });
    return result_id;
}

async function saveMail(account: string, folder: string, gmail: gmail_v1.Gmail, id: string) {
    const res = await gmail.users.threads.get({
        userId: account,
        id: id,
        format: 'full'
    });
    console.log("Get staus: " + res.status);
    const title_candidates = ((res.data.messages || [])[0].payload?.headers || [])
    let title = await getMailTitle(title_candidates)
    title = await incr_filename(title, folder)
    // const TOKEN_PATH = path.join(folder, `${ title }.md`);
    let txt = await processMailBody(res)
    txt = appendPrefix("tags:: #captured\n", txt)
    await this.app.vault.create(folder + "/" + `${title}.md`, txt)
    // await fs.writeFile(TOKEN_PATH, txt);
}

async function fetchMailList(account: string, labelID: string, gmail: gmail_v1.Gmail) {
    // console.log(gmail)
    const res = await gmail.users.threads.list({
        userId: account,
        labelIds: [labelID],
        maxResults: 100
    });
    return res.data.threads;
}

async function updateLabel(account: string, from_labelID: string, to_labelID: string, id: string, gmail: gmail_v1.Gmail) {
    const res = await gmail.users.threads.modify({
        userId: account,
        id: id,
        requestBody: {
            addLabelIds: [to_labelID],
            removeLabelIds: [from_labelID]
        },
    });

}

async function mkdirP(path: string) {
    const isExist = await this.app.vault.exists(path)
    if (!isExist) {
        this.app.vault.createFolder(path)
    }
}

async function fetchMails(account: string, fromID: string, toID: string, base_folder: string, amount: number, gmail: gmail_v1.Gmail) {
    new Notice('Gmail: Fetch starting');
    await mkdirP(base_folder)
    const threads = await fetchMailList(account, fromID, gmail) || []
    if (threads.length == 0) {
        new Notice(`Gmail: Your inbox is up to date`);
        return
    }
    const len = Math.min(threads.length, amount)
    for (let i = 0; i < len; i++) {
        if (i % 5 == 0 && i > 0)
            new Notice(`Gmail: ${(i / len * 100).toFixed(0)}% fetched`);
        const id = threads[i].id || ""
        await saveMail(account, base_folder, gmail, id);
        await updateLabel(account, fromID, toID, id, gmail);
    }
    new Notice(`Gmail: ${len} mails fetched.`);
    if (threads.length > amount)
        new Notice(`Gmail: There are ${threads.length - amount} mails not fetched.`);
    else
        new Notice(`Gmail: Your inbox is up to date`);
}
