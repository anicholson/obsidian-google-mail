# Obsidian Google Mail

This plugin save emails on Gmail as markdown notes.
The plugin use email labels to select which mails to fetch, and a new label will be added to distiguish.

## Application Scenarios

1. Automatically save subsribed newsletter and takes note on it.
2. You can email ideas to yourself and let the plugin collect them into PKM.

## Installation - I

The plugin relys on Google Gmail API, so you need to first apply an credentials. The flow is a little tedious but not hard actaully.

1. Goto https://console.cloud.google.com/ and create a project.
2. Goto Menu(on top left) > API & Services > Enable API & Services
  - Search and enable gmail api
2. Goto Menu(on top left) > API & Services > Credentials
3. In Credential page: CREATE CREDENTIALS (top) > Select OAuth client ID
4. CONIFGURE CONSENT SCREEN
5. External
6. Fill whatever you want on the Required(`*`) fields
7. SAVE AND CONTINUE > SAVE AND CONTINUE > SAVE AND CONTINUE > BACK TO DASHBOARD
  - There is one page to add test user in one of the steps. Add your own gmail account.
8. Repeat step 3, 4
9. Select Web application in the application type field
10. Fill `http://localhost:9999/oauth2callback` in the Redirect URI field.
  - You can use other ports as long as it's not conflict with your computer's setting. Don't worry, you can always modify later.
11. Create & download JSON.
  - The file should contain `client_id`, `client_secret`, and `redirect_uris`

__Congrates You Have Finished the Hard Part__

## Installation - II

1. Install this plugin manually or through BRAT
2. Enable the plugin
3. Fill the absolute path to your credentials.json
  - For default download loaction the path should be
    - `/Users/{username}/Downloads/xxxxxxxxx.json`
4. Click `Setup`
5. A web window should show up and ask you to login google with email access permission.
  - I'm pretty sure this app won't mess up with your emails. But you should still keep the credential file secured.
6. The plugin will automatically query available labels in your Gmail account. Select which one you want fetch emails from and which one you want to add to the mail after it is logged by obsidan.
7. Assign a Folder to store all the collected email notes. A newsletter folder to use with [DB Folder](https://github.com/RafaelGB/obsidian-db-folder) would be useful.

8. Then you are done. Click the ribbon button on left side to fetch all the emails with that label. (The upper limit is 100 mails per click in current design. This one will be an option when the plugin becomes stable.)

9. The mails will lie in the folder waiting for you. The emails are converted to markdown format. Some emails may seem weird, but it is alread good enough to me. Thanks to the contrubuters of [Turndown](https://github.com/mixmark-io/turndown).

10. Each mail will be added a #captured tag. This will also be an option in future releases.

For the From and To labels, I suggest to create two labels for this plugin. One (ReadList in my own case) is asscoicated with Gmail's filter so everything you want to collect will be labeled and move to its own folder. The other label (I use forwared) is used to signify the mail is already be fetched. This plugin assumes these two labels are mutually exclusive.

# Security Issue

While accessing mails with API is convinient and the Google OAuth 2.0 requires you to have credential file and your password(or 2 step auth) to access the API, a local file for convenience may ruin your email account. 

This token.json is created automatically in the vault with all the login information so you don't have to login everytime you want to access the API. But it also means that anyone has that file can do whatever he/she wants to your emails. 

So please don't use this plugin in a shared computer or shared vault. Make use no one can access token.json.
