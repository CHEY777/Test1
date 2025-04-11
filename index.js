const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    makeInMemoryStore,
    DisconnectReason,
    WA_DEFAULT_EPHEMERAL,
    jidDecode,
    getContentType,
    proto,
    generateWAMessageFromContent,
    downloadContentFromMessage,
    generateWAMessageContent,
    generateWAMessage,
    prepareWAMessageMedia,
    areJidsSameUser,
    WAMessageStubType,
    getAggregateVotesInPollMessage
} = require('@whiskeysockets/baileys');

const P = require('pino');
const fs = require('fs');
const path = require('path');
const { Boom } = require('@hapi/boom');

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: P({ level: 'silent' }),
        generateHighQualityLinkPreview: true,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error = Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log('Bot connected to WhatsApp!');
        }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        const msg = messages[0];
        if (!msg.message) return;

        const mtype = Object.keys(msg.message)[0];
        const content = msg.message[mtype];

        // If it's a forwarded newsletter message
        if (msg.message?.forwardedNewsletterMessageInfo) {
            const info = msg.message.forwardedNewsletterMessageInfo;
            console.log("Forwarded Newsletter Info:");
            console.log("newsletterJid:", info.newsletterJid);
            console.log("newsletterName:", info.newsletterName);
            console.log("serverMessageId:", info.serverMessageId);

            await sock.sendMessage(msg.key.remoteJid, {
                text: `Newsletter Info:\n- JID: ${info.newsletterJid}\n- Name: ${info.newsletterName}\n- Message ID: ${info.serverMessageId}`
            });
        }

        // Example reply to all incoming messages
        if (!msg.key.fromMe && type === 'notify') {
            await sock.sendMessage(msg.key.remoteJid, { text: 'Hello from Anya-Bot!' });
        }
    });
}

startBot();
