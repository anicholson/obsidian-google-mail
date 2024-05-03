import { Notice, base64ToArrayBuffer } from 'obsidian';
import { gmail_v1 } from '@googleapis/gmail';
import { processBody, incr_filename } from 'src/mailProcess';
import { ObsGMailSettings } from 'src/setting';
import { authorize } from 'src/GOauth';
import { assertPresent } from './typeHelpers';

export type GMail = gmail_v1.Gmail
// @ts-ignore
export function createGmailConnect(client) : GMail {
    return new gmail_v1.Gmail({
        auth: client
    })
}

const label_options = new Map(
    [
        ["tag", "#{}"],
        ["link", "[[{}]]"]
    ])

const body_options = new Map(
    [
        ["htmlmd", "htmlmd"],
        ["text", "text"],
        ["raw", "raw"]
    ])

export async function fetchMailAction(settings: ObsGMailSettings) {

    if (settings.gc.gmail) {
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
    const label_list = Array<Array<string>>();
    labels.forEach((label) => {
        label_list.push([String(label.name), String(label.id)])
    });
    return label_list;
}

function fillTemplate(template: string, mail: Map<string, string>) {
    const string = template.replace(
        /\${\w+}/g,
        function (all) {
            return mail.get(all) || '';
        });
    return string
}

function getFields(ary: PayloadHeaders) {
    const m = new Map<string, string>()
    ary.filter((item) => item.name && item.value).forEach((item) => {
		assertPresent(item.name, "No name in payload")
		assertPresent(item.value, "No value in payload")
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
async function obtainTemplate(template_path: string) {
    let template = "${Body}" // default template
    if (template_path) {
        template = await this.app.vault.readRaw(template_path)
    }
    // Obtain label option
    const label_match = template.match(/\$\{Labels\|*(.*)\}/) || []
    const label_format = label_options.get(label_match[1]) || "#{}"
    template = template.replace(/\$\{Labels.*\}/, "${Labels}")
    // Obtain body format
    const body_match = template.match(/\$\{Body\|*(.*)\}/) || []
    const body_format = body_options.get(body_match[1]) || "htmlmd"
    template = template.replace(/\$\{Body.*\}/, "${Body}")
    return { template: template, label_format: label_format, body_format: body_format }
}

function cleanFilename(filename: string) {
    return filename.replace(/[\\/:"*?<>|]+/g, '_')
}

async function getAttachment(gmail:gmail_v1.Gmail, account: string, message_id: string, attachment_id: string) {
    const res = await gmail.users.messages.attachments.get({
        userId: account,
        messageId: message_id,
        id: attachment_id
    });
    return res
}

async function getAttachments(gmail:gmail_v1.Gmail, account:string, msgId: string, parts: MessagePart[], folder:string){
    const files = Array<string>();
    for(let i = 0; i < parts.length; i++){
        const part = parts[i];
        const filename = part.filename
        const attach_id = part.body?.attachmentId

		if(!filename || !attach_id) {
			console.debug(msgId, `Part ${i} has no filename or attachmentId, skipping...`)
			continue
		}

        const ares = await getAttachment(gmail, account, msgId, attach_id)
        const red = ares.data?.data?.replace(/-/g, '+').replace(/_/g, '/') || ""
        const init_name = filename
        const final_name = await incr_filename(init_name, folder)
        await this.app.vault.createBinary(final_name, base64ToArrayBuffer(red))
        files.push(final_name)
    }
    return files
}

function flatten_parts(mbObj: MailboxObject, parts: MessagePart[]){
    if(parts.length == 2 && parts[0].mimeType =='text/plain' && parts[1].mimeType =='text/html'){
		assertPresent(parts[0].body, "MessagePart had text/plain MIME type but no body!")
		assertPresent(parts[1].body, "MessagePart had text/html MIME type but no body!")
        mbObj.raw_mtxt = parts[0].body
        mbObj.raw_mhtml = parts[1].body
        for(let i = 2; i < parts.length; i++){
            mbObj.assets.push(parts[i])
        }
        return mbObj
    }
    else {
        parts.forEach((part) => {
            if(part.mimeType=='multipart/related'||part.mimeType=="multipart/alternative" || part.mimeType=="multipart/mixed"){ 
				assertPresent(part.parts, "MessagePart had mixed MIME type but no sub-parts!")
				flatten_parts(mbObj, part.parts)
			}
            else {
                mbObj.assets.push(part)
			}
        })
    }
}

 type MailboxObject = {
    assets: Array<MessagePart>,
	raw_mhtml: MessagePartBody | null,
	raw_mtxt: MessagePartBody| null,
    mhtml: string,
    mtxt: string
}

function getLabelIDs(res: gmail_v1.Schema$Thread) {
	const messages = res.messages;
	if(messages && messages[0]?.labelIds) {
		return messages[0].labelIds;
	} else {
		return []
	}
}

export type PayloadHeaders = gmail_v1.Schema$MessagePartHeader[]
export type MessagePart = gmail_v1.Schema$MessagePart
export type MessagePartBody = gmail_v1.Schema$MessagePartBody

async function saveMail(settings: ObsGMailSettings, id: string) {
    const note = await obtainTemplate(settings.template)
    const noteName_template = settings.noteName
    const gmail = settings.gc.gmail
	assertPresent(gmail, "Gmail is not setup properly")
    const account = settings.mail_account
    const folder = settings.mail_folder
    const res = await gmail.users.threads.get({
        userId: account,
        id: id,
        format: 'full'
    });
	assertPresent(res.data.messages, `No messages in thread with id: ${id}`)
    const title_candidates: PayloadHeaders = ((res.data.messages || [])[0].payload?.headers || [])
    const labels = getLabelIDs(res.data).map((labelID: string) => getLabelName(labelID, settings.labels))
    const fields = getFields(title_candidates)
    fields.set('${Date}', formatDate(fields.get('${Date}') || ""))
    fields.set('${Labels}', labels.map((label: string) => note.label_format.replace(/\{\}/, label)).join(', '))
	// Fetch the last mail in the threads
    const payload = res.data.messages.pop()?.payload
    assertPresent(payload, `No payload in thread with id: ${id}`)
    const mailboxObject: MailboxObject = {assets: [], raw_mhtml:null, raw_mtxt:null, mhtml:"", mtxt:""}
	const parts : MessagePart[] = payload.parts ? payload.parts : [payload]
    flatten_parts(mailboxObject, parts)
    if(!mailboxObject.raw_mhtml && !mailboxObject.raw_mtxt){
		let bodyText = ""
		const htmlAsset = mailboxObject.assets.find((asset)=> asset.mimeType == "text/html" || asset.mimeType == "text/plain");
		if(htmlAsset && htmlAsset.body?.data) {
			bodyText = htmlAsset.body.data
		} else {
			console.warn("no body found")
		}
        mailboxObject.mhtml = bodyText
        mailboxObject.mtxt = bodyText
    }
    console.log("mailboxObject:")
    console.log(payload)
    console.log(mailboxObject)

    const body = await processBody([mailboxObject.raw_mtxt, mailboxObject.raw_mhtml], note.body_format)
    fields.set('${Body}', body)
    fields.set('${Link}', `https://mail.google.com/mail/#all/${id}`)
    const noteName = cleanFilename(fillTemplate(noteName_template, fields))
    const finalNoteName = await incr_filename(noteName+`.md`, folder)
    if(settings.toFetchAttachment && (mailboxObject.assets.length > 0)){
		assertPresent(payload.headers, "No headers in payload")
		assertPresent(payload.headers[2], "No headers in payload")

        const msgID = payload.headers[2].value

		assertPresent(msgID, "No msgID in payload")
        await mkdirP(settings.attachment_folder);
        const files = await getAttachments(gmail, account, 
            msgID, mailboxObject.assets, settings.attachment_folder);
        fields.set('${Attachment}', files.map(f=>`![[${f}]]`).join('\n'))
    }
    else
        fields.set('${Attachment}', "")
    const content = fillTemplate(note.template, fields)
    await this.app.vault.create(finalNoteName, content)
}

async function fetchMailList(account: string, labelID: string, gmail: gmail_v1.Gmail) {
    const res = await gmail.users.threads.list({
        userId: account,
        labelIds: [labelID],
        maxResults: 100
    });
    return res.data.threads;
}

async function updateLabel(account: string, from_labelID: string, to_labelID: string, id: string, gmail: gmail_v1.Gmail) {
    await gmail.users.threads.modify({
        userId: account,
        id: id,
        requestBody: {
            addLabelIds: [to_labelID],
            removeLabelIds: [from_labelID]
        },
    });
}

async function destroyMail(account: string, id: string, gmail: gmail_v1.Gmail) {
    await gmail.users.threads.trash({
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
    assertPresent(gmail, "Gmail is not setup properly")

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
        await updateLabel(account, fromID, toID, id, gmail);
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
