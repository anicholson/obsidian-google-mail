1. Goto Menu(on top left) > API & Services > Enable API & Services

    - Search and enable gmail api



https://user-images.githubusercontent.com/29173832/199785925-65702d53-96fe-415c-a248-2cdcb7a55598.mp4



2. Setup OAuth consent screen

    1. Goto Menu(on top left) > OAuth consent screen
    2. Select External > CREATE
    3. Fill required fields (with whatever value you want) > SAVE AND CONTINUE
    4. SAVE AND CONTINUE
    5. Add your email (and your friends email) to test users > SAVE AND CONTINUE
    6. Back to Dashboard



https://user-images.githubusercontent.com/29173832/199786096-b1473d12-868f-4495-94a0-8e3c1ce8bdc5.mp4



3. Goto Menu(on top left) > API & Services > Credentials

  1. In Credential page: CREATE CREDENTIALS (top) > Select OAuth client ID
  2. Select Web application in the application type field
  3. Fill `http://localhost:9999/oauth2callback` in the Redirect URI field.

      - You can use other ports as long as it's not conflict with your computer's setting. Don't worry, you can always modify later.

https://user-images.githubusercontent.com/29173832/199786379-50db8320-c6cd-4fb5-8af5-3938947deb1a.mp4
https://user-images.githubusercontent.com/29173832/199787005-0fb12dfe-5544-45f8-b7f6-ba8da2c44fc6.mp4


4. Create & download JSON.

    - The file should contain `client_id`, `client_secret`, and `redirect_uris`
__🎉 Congratulation You Have Finished the Hard Part 🙌__
