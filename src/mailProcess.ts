import { request } from 'obsidian';
import { NodeHtmlMarkdown, NodeHtmlMarkdownOptions } from 'node-html-markdown'
const TurndownService = require('turndown')
const turndownService = new TurndownService()

export async function getMailTitle(title_candidates) {
    let title = findTitle(title_candidates)
    title = formatTitle(title)
    return title
}

export async function processMailBody(res) {
    const payload = (res.data.messages || [])[0].payload
    let raw = ""
    if (payload.parts)
        raw = (payload?.parts || [])[1].body?.data || ""
    else
        raw = payload.body?.data || ""
    let txt = base64ToUTF8(raw);
    txt = turndownService.turndown(txt)
    txt = txt.replace(/(.*\n\n)/m, "")
    // txt = replaceInMailLink(txt)
    // txt = await retriveURITitle(txt)
    return txt
}

function base64ToUTF8(data: string) {
    return new Buffer(data, 'base64').toString("utf-8")
}




function replaceInMailLink(text: string) {
    const regex = /(\S*) (\(https:\/\/[^)]*\))/gm;
    return text.replace(regex, `[$1]$2`)
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
            if (notBlank(noTitle)) {
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

async function replaceAsync(str, regex, asyncFn) {
    const promises = [];
    str.replace(regex, (match, ...args) => {
        const promise = asyncFn(match, ...args);
        promises.push(promise);
    });
    const data = await Promise.all(promises);
    return str.replace(regex, () => data.shift());
}

async function uriToTitleURI(url: string): Promise<string> {
    url = url.trim()
    const title = await fetchUrlTitle(url);
    return `[${title}](${url})`
}

async function retriveURITitle(text: string) {
    const regex = /[^(](http.*)[^)]/gm;
    return replaceAsync(text, regex, uriToTitleURI)
}

export function appendPrefix(prefix: string, text: string) {
    if (prefix[prefix.length - 1] != "\n")
        prefix += "\n"
    return prefix + text
}

function formatTitle(title: string) {
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