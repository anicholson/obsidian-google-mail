# Obsidian Google Mail

This plugin save emails on Gmail as markdown notes. Use this plugin [safely](#security-issue) so you won't mess up your gmail account.

## Application Scenarios

1. Automatically save subsribed newsletter and takes note on it.
2. You can email ideas to yourself and let the plugin collect them into vault.



https://user-images.githubusercontent.com/29173832/199773312-3f501499-64aa-419b-b4fe-c6303b9e53fd.mov



## Installation - I

__Already have a credential__ : If you're using google api in other [plugins](#thanks) you can simple enable the Gmail api for that project, then you can reuse the credential.

__Use my credential__ : I have a credential for 100 users and would like to know how much it's gonna cost for multiple users. Contact me so you don't need to go through this part.


1. Goto https://console.cloud.google.com/ and create a project.
2. Goto Menu(on top left) > API & Services > Enable API & Services

    - Search and enable gmail api

3. Setup OAuth consent screen

    1. Goto Menu(on top left) > OAuth consent screen
    2. Select External > CREATE
    3. Fill required fields (with whatever value you want) > SAVE AND CONTINUE
    4. SAVE AND CONTINUE
    5. Add your email (and your friends email) to test users > SAVE AND CONTINUE
    6. Back to Dashboard

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
7. Then you are done. Click the ribbon button on left side to fetch all the emails with that label. 

## Setup in Gmail

__Labels__:
This plugin use label to decide which mail to fetch. So you need to use Gmail to assign the {From} label to those mails you want to fetch. The {From} label will be removed from the fetched mails, and {To} label will be added. These two labels should be mutually exclusive. I suggest to create a new label for {To}. 

__Filters__:
- You can add {From} label to mails manually when you review you inbox.
- Or You can also setup filters to add the labels automatically.
  - Check the [tutorial here](https://support.google.com/mail/answer/6579?hl=en#zippy=%2Ccreate-a-filter%2Cedit-or-delete-filters).
  - Add the newletters so you can take notes on them
  - Add the mails you send to yourself, so you can achieve "email to obsidian".
  
## Template

Check [Template](Template.md) to learn how to setup a note template for email notes.

# Security Issue

__Background__: 
Currently, the plugin will keep a `.token.json` file containing all the information required to access gmail account, so you don't have login everytime. But it also means that anyone with the file can do whatever he/she wants to your emails. Except for the others, all plugins you use have access to this file, too.

This is actually a common issue for plugins trying to integrate other services. There are [discussions](https://forum.obsidian.md/t/a-place-for-plugins-sensitive-data/18308) about how to safely keep these security files. But it's not gonna easy for a pure local application.

__What to do?__ For now, please don't use this plugin in public computers or shared vaults. Make sure no one can access the token file. 

__Another approach__ is that if you use this plugin for "newsletters" and "send to obsidian", then you can create a separate gmail account for them so those important business letters won't be afftected.

# Other details

- The upper limit is 100 mails per click in current design. This one will be an option when the plugin becomes stable.
  - https://github.com/thingnotok/obsidian-google-mail/issues/2
- The mails are converted to markdown format. Some emails may seem weird, but it is alread good enough to me now. 
  - Thanks to the contrubuters of [Turndown](https://github.com/mixmark-io/turndown).
- Each mail will be added with the #captured tag. This will also be an option in future releases. 
  - Check https://github.com/thingnotok/obsidian-google-mail/issues/1


# Thanks

The plugin originates from [u/egauthier64](https://www.reddit.com/r/ObsidianMD/comments/yjiq4f/comment/iuqr10u/?context=3)'s email-to-obsidian idea but is an approach based on Gmail server. For the Google API part, I would like to thank [YukiGasai](https://github.com/YukiGasai/obsidian-google-tasks/commits?author=YukiGasai) for his great work on Google series plugins for obsidian and I learn a lot from his implementation. Please check his awesome plugins here, they are extremely useful with google suite and obsidian:

- [obsidian-google-calendar](https://github.com/YukiGasai/obsidian-google-calendar): View the google calender and add/delete events from obsidian.
- [obsidian-google-task](https://github.com/YukiGasai/obsidian-google-tasks): Allow you to see and manipulate google tasks from obsidian.
