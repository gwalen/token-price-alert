# Token Alert

### Installation & configuration guide 

#### 1. install npm and node.js

https://docs.npmjs.com/downloading-and-installing-node-js-and-npm

#### 2. download Token alert app

git clone or download zip from repo

#### 3. configure telegram bot

a) create a new bot and copy its access token as described in this tutorial
https://core.telegram.org/bots#6-botfather

b) make sure you have your username set in telegram first (in telegram settings)

c) create a new group chat 

d) add @RawDataBot to group

Look for lines with chatID
```
"chat": {
  "id": -419695018,
```

e) add your bot to this chat

f) paste chatId (from d)) and bot access token (from a)) to application variables

Open `.env` file in app main directory replace `REACT_APP_TELEGRAM_BOT_CHAT_ID` value with your `chatId` and replace `REACT_APP_TELEGRAM_BOT_ACCESS_TOKEN`
with `bot access token`
    
#### 4. configure alerts 

Modify file `/src/data/tokens.json`. 

#### 5. turn on/off sounds 

Open `.env` file in app main directory and sett `on/off` value for `REACT_APP_PLAY_SOUND`


### Start app

in the root directory open terminal and type `npm run start`. Browser should start with token alters table. 