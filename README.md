# Obsidian Google Mail

This plugin saves emails on Gmail as markdown notes. Use this plugin [safely](#security-issue) so you won't mess up your gmail account.

## Application Scenarios

1. Automatically save subsribed newsletter and takes note on it.
2. You can email ideas to yourself and let the plugin collect them into vault.



https://user-images.githubusercontent.com/29173832/199773312-3f501499-64aa-419b-b4fe-c6303b9e53fd.mov



## Installation - I

__Already have a credential__ : If you're using google api in other [plugins](#thanks) you can simplely enable the Gmail api for that project, then you can reuse the credential.

__Create your own credential, it's free__ :  Goto https://console.cloud.google.com/ to create the credential. 

- The detail steps with video can be found [here](get-cred.md)

## Installation - II

1. Install this plugin manually or through BRAT
    - Add https://github.com/thingnotok/obsidian-google-mail
2. Enable the plugin, and click option (or open the seting panel of this plugin)
3. Click `Setup` button and Paste content from credential.json ([from installation I](#installation---i))
4. A web window should show up and ask you to login google with email access permission.
5. The plugin will automatically query available labels in your Gmail account. Select the from/to labels to fetch.

	- From: Label to fetch from Gmail. 
	- To: Fetched mail will be added with this label
	
6. Assign a Folder to store all the collected email notes. (Default is "fetchedMail")

    - The plugin will create a folder if not exists.
    - A newsletter folder to use with [DB Folder](https://github.com/RafaelGB/obsidian-db-folder) would be useful to organize your mail notes.
	
7. Click the ribbon button on left side to fetch all the emails with that label. 

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
Currently, the plugin will keep a `.token.json` file containing all the information required to access gmail account, so you don't have login everytime. But it also means that anyone with the file can do whatever he/she wants to your emails. In addition to the others, all plugins you use have access to this file, too.

This is actually a common issue for plugins trying to integrate other services. There are [discussions](https://forum.obsidian.md/t/a-place-for-plugins-sensitive-data/18308) about how to safely keep these security files. But it's not gonna easy for a pure local application.

__What to do?__ For now, please don't use this plugin in public computers or shared vaults. Make sure no one can access the token file. 

__Another approach__ is that if you use this plugin for "newsletters" and "send to obsidian", then you can create a separate gmail account for them so those important business letters won't be afftected.

# Other details

- The mails are converted to markdown format. Some emails may seem weird. 
  - Thanks to the contrubuters of [Turndown](https://github.com/mixmark-io/turndown).
  - I will add support to save email in plaintext format. Plaintext is suited for note-taking and avoid most of weidly large images in the note.


# Thanks

- The plugin originates from [u/egauthier64](https://www.reddit.com/r/ObsidianMD/comments/yjiq4f/comment/iuqr10u/?context=3)'s email-to-obsidian idea but is an approach based on Gmail server. 
- Thanks to [YukiGasai](https://github.com/YukiGasai/obsidian-google-tasks/commits?author=YukiGasai) for his great work on Google series plugins for obsidian. Please check his awesome plugins here, they are extremely useful with google suite and obsidian:
	- [obsidian-google-calendar](https://github.com/YukiGasai/obsidian-google-calendar): View the google calender and add/delete events from obsidian.
	- [obsidian-google-task](https://github.com/YukiGasai/obsidian-google-tasks): Allow you to see and manipulate google tasks from obsidian.
- Thanks to [@thingnotok](https://github.com/thingnotok) for their great work on this plugin and maintenance.
