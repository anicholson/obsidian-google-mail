import { request } from 'obsidian'
import TurndownService from 'turndown'
import { warning } from './typeHelpers'
import { MessagePartBody } from './GmailAPI'
const turndownService = new TurndownService()
turndownService.remove(['style', 'title'])
// @ts-ignore

async function getBody(bodys: Array<MessagePartBody | null>, format: string){
    let body : string
	const normalizedBodys = bodys.map((b) => {
		if(b && typeof b == "object"){
			if(b.data)
				return b.data
			else {
			return ""
			}
		} else if (b && typeof b == "string") {
			return b
		} else {
			warning("Couldn't parse email body")
			throw new Error("Unknown body type")
		}
	})
    if (format == "htmlmd")
        body = await processHTMLBody(normalizedBodys[1])
    else if (format == "text")
        body = await processPTBody(normalizedBodys[0])
    else
        body = await processRawBody(normalizedBodys[1])
    if (body=="")
        body = await processRawBody(normalizedBodys[1] || normalizedBodys[0] || "")
    return body
}

export async function processBody(bodys: Array<MessagePartBody| null>, format: string) {
    return getBody(bodys, format)
}


async function processRawBody(raw: string) {
    return base64ToUTF8(raw);
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
            const noTitle = title?.getAttr("no-title");
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

// TODO: Split this into pieces so the string manipulation does not get caught in the async behaviour
async function fetchUrlTitle(url: string): Promise<string> {
    try {
        const title = await GetPageTitle(url);
        return title.replace(/(\r\n|\n|\r)/gm, "").trim();
    } catch (error) {
        return "Site Unreachable";
    }
}

type ReplaceAsyncFn = (match: string, ...args: unknown[]) => Promise<string>
// @ts-ignore
async function replaceAsync(str: string, regex: RegExp, asyncFn: ReplaceAsyncFn) {
    
    const promises : Array<Promise<string>>= [];
    
    str.replace(regex, (match, ...args) => {
        const promise = asyncFn(match, ...args);
        promises.push(promise);
		//TODO: Verify this is correct
		return match;
    });
    
    const data = await Promise.all(promises);
    return str.replace(regex, () => data.shift() || "");
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
