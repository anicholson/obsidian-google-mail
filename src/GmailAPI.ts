import { Notice } from 'obsidian';
import { google, gmail_v1 } from 'googleapis';
import { formatTitle, processHTMLBody, incr_filename, appendPrefix } from 'src/mailProcess';
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

    if (settings.gc.gmail) {
        // console.log("gmail instance exist");
        await authorize(settings).then(() => {
            fetchMails(settings);
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

function fillTemplate(template: string, mail: Map<string, string>) {
    const string = template.replace(
        /\${\w+}/g,
        function (all) {
            return mail.get(all) || '';
        });
    return string
}

function getFields(ary: Array<{ name: string, value: string }>) {
    const m = new Map<string, string>()
    ary.forEach((item) => {
        m.set("${" + item.name + "}", item.value)
    })
    return m
}

function getLabelName(id: string, labels: Array<Array<string>>) {
    for (let i = 0; i < labels.length; i++)
        if (id == labels[i][1])
            return labels[i][0]
    return ""
}
function formatDate(iso_date: string) {
    const d = new Date(iso_date);
    return d.toISOString().split('T')[0]
}
async function saveMail(settings: ObsGMailSettings, id: string) {
    const gmail = settings.gc.gmail
    const account = settings.mail_account
    const folder = settings.mail_folder
    const res = await gmail.users.threads.get({
        userId: account,
        id: id,
        format: 'full'
    });
    console.log("Get staus: " + res.status);
    const title_candidates = ((res.data.messages || [])[0].payload?.headers || [])
    const labelIDs = (res.data.messages || [])[0].labelIds;
    const labels = labelIDs.map((labelID: string) => getLabelName(labelID, settings.labels))
    const fields = getFields(title_candidates)
    fields.set('${Date}', formatDate(fields.get('${Date}') || ""))
    fields.set('${Labels}', labels.map((label: string) => `[[${label}]]`).join(', '))
    let title = formatTitle(fields.get('${Subject}') || "")
    title = await incr_filename(title, folder)
    // let body = ""
    // Fetch the last mail in the threads
    const body = await processHTMLBody(res.data.messages.pop().payload)
    fields.set('${Body}', body)
    fields.set('${Link}', `https://mail.google.com/mail/#all/${id}`)
    // console.log(fields)
    let content = body
    let template = "${Body}"
    if (settings.template) {
        template = await this.app.vault.readRaw(settings.template)
    }
    content = fillTemplate(template, fields)
    await this.app.vault.create(folder + "/" + `${title}.md`, content)
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

async function destroyMail(account: string, id: string, gmail: gmail_v1.Gmail) {
    const res = await gmail.users.threads.trash({
        userId: account,
        id: id,
    });

}

async function mkdirP(path: string) {
    const isExist = await this.app.vault.exists(path)
    if (!isExist) {
        this.app.vault.createFolder(path)
    }
}

async function fetchMails(settings: ObsGMailSettings) {
    const account = settings.mail_account;
    const fromID = settings.from_label;
    const toID = settings.to_label;
    const base_folder = settings.mail_folder;
    const amount = settings.fetch_amount;
    const gmail = settings.gc.gmail;

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
        await saveMail(settings, id);
        // await updateLabel(account, fromID, toID, id, gmail);
        if (settings.destroy_on_fetch) {
            await destroyMail(account, id, gmail)
        }
    }
    new Notice(`Gmail: ${len} mails fetched.`);
    if (threads.length > amount)
        new Notice(`Gmail: There are ${threads.length - amount} mails not fetched.`);
    else
        new Notice(`Gmail: Your inbox is up to date`);
}
