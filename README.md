# Obsidian Google Mail

This plugin save emails on Gmail as markdown notes.
The plugin use email labels to select which mails to fetch, and a new label will be added to distiguish.

## Application Scenarios

1. Automatically save subsribed newsletter and takes note on it.
2. You can email ideas to yourself and let the plugin collect them into PKM.

## Installation - I

The plugin relys on Google Gmail API, so you need to first apply an credentials. The flow is a little tedious but not hard actaully.

This flow may still confusing to non-coder people, so let me know if you have trouble setting these up. I'm also thinking about offering people to use my credentials to access Gmail (still your gmail account, but you don't need to go through this part), but I'm not sure how much will it cost if too many people are using it. Currently I have 100 test user quota to offer, let me know (leave a issue, or thingnotok_at_gmail.com) if you want to have this little trial run with me.

1. Goto https://console.cloud.google.com/ and create a project.
2. Goto Menu(on top left) > API & Services > Enable API & Services
  - Search and enable gmail api
3. Setup OAuth consent screen
  1. Goto Menu(on top left) > OAuth consent screen
  2. Select External > CREATE
  3. Fill required fields (with whatever value you want) > SAVE AND CONTINUE
  4. > SAVE AND CONTINUE
  5. Add your email (and your friends email) to test users > SAVE AND CONTINUE
  6. > Back to Dashboard
3. Goto Menu(on top left) > API & Services > Credentials
  1. In Credential page: CREATE CREDENTIALS (top) > Select OAuth client ID
  2. Select Web application in the application type field
  3. Fill `http://localhost:9999/oauth2callback` in the Redirect URI field.
    - You can use other ports as long as it's not conflict with your computer's setting. Don't worry, you can always modify later.
  4. Create & download JSON.
    - The file should contain `client_id`, `client_secret`, and `redirect_uris`

__🎉 Congratulation You Have Finished the Hard Part 🙌__

## Installation - II

1. Install this plugin manually or through BRAT
    - Add https://github.com/thingnotok/obsidian-google-mail
2. Enable the plugin, and click option (or open the seting panel of this plugin)
3. Click `Setup` button and Paste content of credential.json
4. A web window should show up and ask you to login google with email access permission.
  - Don't worry, this app won't mess up with your emails. But you should still keep the credential file secured.
5. The plugin will automatically query available labels in your Gmail account. Select which one you want fetch emails from and which one you want to add to the mail after it is logged by obsidan.
6. Assign a Folder to store all the collected email notes. (Default is "Mail")
  - The plugin will create a folder if not exists. Since the plugin can manipulate the files in the folder, it's better not to use existing folders.
  - A newsletter folder to use with [DB Folder](https://github.com/RafaelGB/obsidian-db-folder) would be useful to organize your mails.
7. Then you are done. Click the ribbon button on left side to fetch all the emails with that label. (The upper limit is 100 mails per click in current design. This one will be an option when the plugin becomes stable.)
8. The mails will lie in the folder waiting for you. The mails are converted to markdown format. Some emails may seem weird, but it is alread good enough to me now. Thanks to the contrubuters of [Turndown](https://github.com/mixmark-io/turndown).
9. Each mail will be added with the #captured tag. This will also be an option in future releases.

## Setup in Gmail

__Labels__:
This plugin use label to decide which mail to fetch. So you need to use Gmail to assign the "From" label to those mails you want to fetch. The "From" label will be removed from the fetched mails, and "To" label will be added. These two labels should be mutually exclusive. I suggest to create a new label for "To". 

__Filters__:
- You can add "From" label to mails when you review you inbox.
- Or You can also setup filters to add labels to mails automatically.
  - Check the [tutorial](https://support.google.com/mail/answer/6579?hl=en#zippy=%2Ccreate-a-filter%2Cedit-or-delete-filters) here.
  - Add the newletters so you can take notes on them
  - Add the mails you send to yourself, so you can email to obsidian.

# Security Issue

Currently, the plugin will keep a `.token.json` file containing all the information required to access gmail account, so you don't have login everytime. But it also means that anyone with the file can do whatever he/she wants to your emails. Except for the others, all plugins you use have access to this file, too.

This is actually a common issue for integration plugins. There are [discussions](https://forum.obsidian.md/t/a-place-for-plugins-sensitive-data/18308) about how to safely keep these security files. But it's not gonna easy for a pure local application.

For now, please don't use this plugin in public computers or shared vaults. Make sure no one can access the token file. Another approach is that if you use this plugin for "newsletters" and "send to obsidian", then you can create a separate gmail account for them so those important business letters won't be afftected.

# Thanks

The plugin originates from [u/egauthier64](https://www.reddit.com/r/ObsidianMD/comments/yjiq4f/comment/iuqr10u/?context=3)'s email-to-obsidian idea but is an approach based on Gmail server. For the Google API part, I would like to thank [YukiGasai](https://github.com/YukiGasai/obsidian-google-tasks/commits?author=YukiGasai) for his great work on Google series plugins for obsidian and I learn a lot from his implementation. Please check his awesome plugins here, they are extremely useful with google suite and obsidian:

- [obsidian-google-calendar](https://github.com/YukiGasai/obsidian-google-calendar): View the google calender and add/delete events from obsidian.
- [obsidian-google-task](https://github.com/YukiGasai/obsidian-google-tasks): Allow you to see and manipulate google tasks from obsidian.
