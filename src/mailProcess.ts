import { request } from 'obsidian';
const TurndownService = require('turndown')
const turndownService = new TurndownService()
turndownService.remove(['style', 'title'])
// @ts-ignore


async function getMailTitle(title_candidates) {
    let title = findTitle(title_candidates)
    title = formatTitle(title)
    return title
}

async function getBody(parts, format){
    let body = ''
    if (format == "htmlmd")
        body = await processHTMLBody((parts || [])[1].body?.data || "")
    else if (format == "text")
        body = await processPTBody((parts || [])[0].body?.data || "")
    else
        body = await processRawBody((parts || [])[1].body?.data || "")
    return body
}

export async function processBody(payload: any, format: string) {
    let content = ""
    let body = ""
    if (!payload.parts) { // mail only offers html
        if (format == "raw")
            body = await processRawBody(payload.body.data)
        else
            body = await processHTMLBody(payload.body.data)
    }
    else {
        if(!payload.parts[0].parts){
            console.log("Pure mail")
            body = await getBody(payload.parts, format)
        }
        else{
            console.log("Mail with attachment")
            body = await getBody(payload.parts[0].parts, format)
        }
    }
    return body
}


async function processRawBody(raw: string) {
    let txt = base64ToUTF8(raw);
    return txt
}

async function processHTMLBody(raw: string) {
    let txt = base64ToUTF8(raw);
    txt = turndownService.turndown(txt)
    return txt
}

async function processPTBody(raw: string) {
    let txt = base64ToUTF8(raw);
    txt = txt.replace(/(\[image:.*\])/gm, "")
    txt = await retriveURITitle(txt)
    return txt
}

function base64ToUTF8(data: string) {
    return new Buffer(data, 'base64').toString("utf-8")
}

function blank(text: string): boolean {
    return text === undefined || text === null || text === "";
}

function notBlank(text: string): boolean {
    return !blank(text);
}

async function GetPageTitle(url: string): Promise<string> {
    try {
        const html = await request({ url });

        const doc = new DOMParser().parseFromString(html, "text/html");
        const title = doc.querySelectorAll("title")[0];

        if (title == null || blank(title?.innerText)) {
            // If site is javascript based and has a no-title attribute when unloaded, use it.
            var noTitle = title?.getAttr("no-title");
            // @ts-ignore
            if (notBlank(noTitle)) {
                // @ts-ignore
                return noTitle;
            }

            // Otherwise if the site has no title/requires javascript simply return Title Unknown
            return url;
        }

        return title.innerText;
    } catch (ex) {
        console.error(ex);

        return "Site Unreachable";
    }
}

async function fetchUrlTitle(url: string): Promise<string> {
    try {
        const title = await GetPageTitle(url);
        return title.replace(/(\r\n|\n|\r)/gm, "").trim();
    } catch (error) {
        // console.error(error)
        return "Site Unreachable";
    }
}
// @ts-ignore
async function replaceAsync(str, regex, asyncFn) {
    // @ts-ignore
    const promises = [];
    // @ts-ignore
    str.replace(regex, (match, ...args) => {
        const promise = asyncFn(match, ...args);
        promises.push(promise);
    });
    // @ts-ignore
    const data = await Promise.all(promises);
    return str.replace(regex, () => data.shift());
}

async function uriToTitleURI(url: string): Promise<string> {
    url = url.trim()
    const title = await fetchUrlTitle(url);
    return `[${title}](${url})`
}

async function retriveURITitle(text: string) {
    const regex = /(https?:\/{2}[^)\s]*)/gm;
    return replaceAsync(text, regex, uriToTitleURI)
}

export function appendPrefix(prefix: string, text: string) {
    if (prefix[prefix.length - 1] != "\n")
        prefix += "\n"
    return prefix + text
}

export function formatTitle(title: string) {
    title = title.replace(/[/<>:"\\|?*]/g, "-")
    return title
}
function findTitle(list: Array<any>): string {
    for (let i = 0; i < list.length; i++) {
        if (list[i].name == "Subject")
            return list[i].value
    }
    return "EmptyTitle"
}

export async function incr_filename(title: string, folder: string) {
    let tmp = title
    let isExist = await this.app.vault.exists(folder + "/" + `${tmp}.md`)
    let idx = 1
    while (isExist) {
        tmp = title + "_" + idx.toString()
        isExist = await this.app.vault.exists(folder + "/" + `${tmp}.md`)
        idx++
    }
    return tmp
}