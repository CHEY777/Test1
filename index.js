const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const P = require('pino');
const fs = require('fs');

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        logger: P({ level: 'silent' }),
        printQRInTerminal: true,
        browser: ['Anya-Bot', 'Chrome', '1.0']
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom && lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut);
            console.log('Connection closed, reconnecting:', shouldReconnect);
            if (shouldReconnect) {
                startBot();
            }
        } else if (connection === 'open') {
            console.log('Bot is connected to WhatsApp');
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message) return;

        console.log("Received:", msg);

        if (msg.message?.forwardedNewsletterMessageInfo) {
            const info = msg.message.forwardedNewsletterMessageInfo;
            console.log("Channel Info:", {
                id: info.newsletterJid,
                name: info.newsletterName,
                serverId: info.serverMessageId
            });

            await sock.sendMessage(msg.key.remoteJid, {
                text: `*Channel Info Received:*\nNewsletter Name: ${info.newsletterName}\nNewsletter ID: ${info.newsletterJid}\nMessage ID: ${info.serverMessageId}`
            });
        } else {
            await sock.sendMessage(msg.key.remoteJid, {
                text: "Send me a forwarded Channel message to extract info."
            });
        }
    });
}

startBot();
