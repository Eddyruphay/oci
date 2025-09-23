import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import dotenv from 'dotenv';

dotenv.config(); // Carrega as variáveis de ambiente do .env

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    const sock = makeWASocket({
        auth: state,
        pairingCode: true, // Use pairing code instead of QR
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if(qr) {
            console.log('------------------------------------------------');
            console.log('PAIRING CODE: ', qr);
            console.log('------------------------------------------------');
            console.log('Abra o WhatsApp no seu celular, vá em "Aparelhos conectados" > "Conectar um aparelho" > "Conectar com número de telefone" e digite o código acima.');
        }

        if(connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect);
            // reconectar se não for logout
            if(shouldReconnect) {
                connectToWhatsApp();
            }
        } else if(connection === 'open') {
            console.log('opened connection');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async m => {
        for (const message of m.messages) {
            if (!message.message) continue;

            const senderId = message.key.remoteJid;
            const messageText = message.message.conversation || message.message.extendedTextMessage?.text || '';

            if (senderId && messageText) {
                console.log(`New message from ${senderId}: ${messageText}`);

                // Lógica de usuário e histórico removida - será tratada por Cloudflare Workers
                // Exemplo de resposta simples
                if (messageText.toLowerCase() === 'olá') {
                    await sock.sendMessage(senderId, { text: `Olá do 4Reels!` });
                }
            }
        }
    });
}

export default connectToWhatsApp;