const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, proto } = require('@whiskeysockets/baileys');
const P = require('pino');
const { Boom } = require('@hapi/boom');

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    const sock = makeWASocket({
        auth: state,
        logger: P({ level: 'silent' }),
        printQRInTerminal: true,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) connectToWhatsApp();
        } else if (connection === 'open') {
            console.log('Bot connected to WhatsApp!');
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe || m.type !== 'notify') return;

        if (msg.message?.extendedTextMessage?.contextInfo?.forwardedNewsletterMessageInfo) {
            const info = msg.message.extendedTextMessage.contextInfo.forwardedNewsletterMessageInfo;
            const text = `*Forwarded Channel Info:*\n\n` +
                         `• Name: ${info.newsletterName}\n` +
                         `• JID: ${info.newsletterJid}\n` +
                         `• ServerMsgID: ${info.serverMessageId}`;

            console.log(text);

            await sock.sendMessage(msg.key.remoteJid, { text });
        }
    });
}

connectToWhatsApp();
