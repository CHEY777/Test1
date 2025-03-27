const { default: MikuConnect, useSingleFileAuthState } = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");
const fs = require("fs-extra");

const sessionFile = "./session.json";
const { state, saveState } = useSingleFileAuthState(sessionFile);

const miku = MikuConnect({
    auth: state,
    printQRInTerminal: true
});

miku.ev.on("creds.update", saveState);

miku.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
        console.log("Connection closed. Reconnecting...");
        startBot();
    } else if (connection === "open") {
        console.log("Bot connected successfully!");
    }
});

miku.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message) return;
    const sender = msg.key.remoteJid;
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

    console.log(`Message from ${sender}: ${text}`);
    
    if (text.toLowerCase() === "anya") {
        await miku.sendMessage(sender, { text: "Hello! I am Anya Bot!" });
    }
});

function startBot() {
    console.log("Starting Anya Bot...");
}

startBot();
