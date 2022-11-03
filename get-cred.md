1. Goto Menu(on top left) > API & Services > Enable API & Services

    - Search and enable gmail api

2. Setup OAuth consent screen

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
