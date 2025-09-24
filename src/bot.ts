import makeWASocket, { DisconnectReason, WAMessage, WASocket } from '@whiskeysockets/baileys';
import { useKVAuthState } from './kv-store.js';
import { Boom } from '@hapi/boom';
import dotenv from 'dotenv';
import axios from 'axios';
import qrcode from 'qrcode-terminal';
import { botContext } from './shared-context.js';

dotenv.config();

const CLOUDFLARE_WORKER_URL = process.env.CLOUDFLARE_WORKER_URL;
const CLOUDFLARE_AGENT_URL = process.env.CLOUDFLARE_AGENT_URL;

/**
 * Encaminha a mensagem recebida para o endpoint apropriado na Cloudflare.
 * @param sock O socket do WhatsApp
 * @param m A mensagem recebida
 */
async function routeMessage(sock: WASocket, m: WAMessage) {
    if (!m.message) return;

    const remoteJid = m.key.remoteJid;
    if (!remoteJid) return;

    console.log(`[Bot] Mensagem recebida de: ${remoteJid}`);

    const isGroup = remoteJid.endsWith('@g.us');
    const messageContent = m.message.conversation || m.message.extendedTextMessage?.text || '';

    if (isGroup) {
        // Comportamento "Espião Silencioso" para grupos
        if (!CLOUDFLARE_WORKER_URL) return; // Não faz nada se a URL não estiver configurada

        const payload = {
            messageId: m.key.id,
            timestamp: m.messageTimestamp,
            groupId: remoteJid,
            senderId: m.key.participant, // Usar m.key.participant para grupos
            messageContent: messageContent
        };

        try {
            // Fire-and-forget: envia os dados e não espera por resposta.
            await axios.post(CLOUDFLARE_WORKER_URL, payload);
            console.log(`Mensagem do grupo ${remoteJid} encaminhada para o Cérebro.`);
        } catch (error) {
            console.error(`Falha ao encaminhar mensagem do grupo ${remoteJid} para o Cérebro:`, error);
        }

    } else {
        // Comportamento "Agente de Suporte" para chats privados
        if (!CLOUDFLARE_AGENT_URL) return; // Não responde se a URL do agente não estiver configurada

        const payload = {
            messageId: m.key.id,
            timestamp: m.messageTimestamp,
            userId: remoteJid,
            messageContent: messageContent,
            // Futuramente, adicionar dados da imagem/anexo aqui
        };

        try {
            // Envia a mensagem para a IA e espera a resposta para enviar ao usuário.
            const response = await axios.post(CLOUDFLARE_AGENT_URL, payload);
            const replyText = response.data.reply;

            if (replyText) {
                await sock.sendMessage(remoteJid, { text: replyText });
                console.log(`Resposta da IA enviada para ${remoteJid}.`);
            }
        } catch (error) {
            console.error(`Falha ao comunicar com o Agente de IA para ${remoteJid}:`, error);
            // Opcional: enviar uma mensagem de erro padrão para o usuário
            await sock.sendMessage(remoteJid, { text: 'Desculpe, nosso sistema de suporte está temporariamente indisponível.' });
        }
    }
}


async function connectToWhatsApp() {
    const { state, saveCreds } = await useKVAuthState();

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false, // Desativado para usar o qrcode-terminal
        // @ts-ignore
        pairingCode: true, // Ativa o pareamento com código numérico
        // Outras configurações podem ser adicionadas aqui
    });

    // Se o código de pareamento for solicitado, exibe no console
    // @ts-ignore
    if (sock.pairingCode) {
        // @ts-ignore
        console.log(`Seu código de pareamento do WhatsApp é: ${sock.pairingCode}`);
    }


    // Salva a instância do socket no contexto compartilhado para a API usar
    botContext.sock = sock;

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if(qr) {
            console.log('------------------------------------------------');
            console.log('PAIRING CODE: ', qr);
            console.log('------------------------------------------------');
            console.log('Abra o WhatsApp no seu celular, vá em "Aparelhos conectados" > "Conectar um aparelho" > "Conectar com número de telefone" e digite o código acima.');
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Conexão fechada por', lastDisconnect?.error, ', reconectando', shouldReconnect);
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            console.log('Conexão aberta com o WhatsApp.');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async m => {
        for (const message of m.messages) {
            // Roteia a mensagem para a lógica correta (grupo vs privado)
            await routeMessage(sock, message);
        }
    });
}

export default connectToWhatsApp;