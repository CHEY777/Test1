const makeWASocket = require('@whiskeysockets/baileys').default;
const { useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const P = require('pino');

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    const sock = makeWASocket({
        auth: state,
        logger: P({ level: 'silent' }),
        printQRInTerminal: true,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message) return;
        const from = msg.key.remoteJid;

        const forwardedInfo = msg.message?.extendedTextMessage?.contextInfo?.forwardedNewsletterMessageInfo;

        if (forwardedInfo) {
            await sock.sendMessage(from, {
                text: `*Channel Post Info:*\n• Newsletter JID: ${forwardedInfo.newsletterJid}\n• Name: ${forwardedInfo.newsletterName}\n• Message ID: ${forwardedInfo.serverMessageId}`
            });
        } else if (!msg.key.fromMe && m.type === 'notify') {
            await sock.sendMessage(from, { text: 'Hello!' });
        }
    });
}

connectToWhatsApp();
