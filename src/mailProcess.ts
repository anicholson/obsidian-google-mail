import { request } from 'obsidian';
// import {TurndownService} from 'turndown';
var TurndownService = require('turndown')
const turndownService = new TurndownService()
turndownService.remove(['style', 'title'])
// @ts-ignore


async function getMailTitle(title_candidates) {
    let title = findTitle(title_candidates)
    title = formatTitle(title)
    return title
}

async function getBody(bodys:any, format:any){
    let body = ''
    if (format == "htmlmd")
        body = await processHTMLBody(bodys[1].data || "")
    else if (format == "text")
        body = await processPTBody(bodys[0].data  || "")
    else
        body = await processRawBody(bodys[1].data || "")
    if (body=="")
        body = await processRawBody(bodys[1].data || bodys[0].data || "")
    return body
}

export async function processBody(bodys: any, format: string) {
    return getBody(bodys, format)
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
    const name_sp = title.split('.')
    const ext = name_sp.pop()
    const ori_name = name_sp.join('.')
    let tmp = ori_name
    let isExist = await this.app.vault.exists(`${folder}/${tmp}.${ext}`)
    let idx = 1
    while (isExist) {
        tmp = ori_name + "_" + idx.toString()
        isExist = await this.app.vault.exists(`${folder}/${tmp}.${ext}`)
        idx++
    }
    return `${folder}/${tmp}.${ext}`
}