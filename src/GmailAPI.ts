import { Notice } from 'obsidian';
import { google, gmail_v1 } from 'googleapis';
import { getMailTitle, processMailBody, incr_filename, appendPrefix } from 'src/mailProcess';
// @ts-ignore
export function createGmailConnect(client) {
    return google.gmail({
        version: 'v1',
        auth: client
    })
}


export async function listLabels(gmail: gmail_v1.Gmail) {

    const res = await gmail.users.labels.list({
        userId: 'me'
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

async function saveMail(folder: string, gmail: gmail_v1.Gmail, id: string) {
    const res = await gmail.users.threads.get({
        userId: 'me',
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

async function fetchMailList(labelID: string, gmail: gmail_v1.Gmail) {
    const res = await gmail.users.threads.list({
        userId: 'me',
        labelIds: [labelID],
        maxResults: 100
    });
    return res.data.threads;
}

async function updateLabel(from_labelID: string, to_labelID: string, id: string, gmail: gmail_v1.Gmail) {
    const res = await gmail.users.threads.modify({
        userId: 'me',
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

export async function fetchMails(fromID: string, toID: string, base_folder: string, gmail: gmail_v1.Gmail) {
    new Notice('Start Fetch Mail');
    await mkdirP(base_folder)
    const threads = await fetchMailList(fromID, gmail) || []
    console.log(threads);
    for (let i = 0; i < threads.length; i++) {
        if (i % 10 == 0)
            new Notice(`Fetching Mail ${i} /${threads.length}`);
        const id = threads[i].id || ""
        await saveMail(base_folder, gmail, id);
        await updateLabel(fromID, toID, id, gmail);
    }
    new Notice('End Fetch Mail');
}
