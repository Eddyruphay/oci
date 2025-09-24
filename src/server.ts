import express from 'express';
import dotenv from 'dotenv';
import { botContext } from './shared-context';
import connectToWhatsApp from './bot';

// Carrega as variáveis de ambiente do .env
dotenv.config();

// --- Conexão com o WhatsApp ---
// A conexão é iniciada em paralelo para não bloquear o servidor web.
console.log('Iniciando a conexão com o WhatsApp (Músculo Sensorial)...');
connectToWhatsApp().catch(err => {
    console.error("Erro crítico na conexão com o WhatsApp:", err);
    process.exit(1); // Força um restart em caso de erro crítico na inicialização.
});

// --- Configuração do Servidor Express ---
const app = express();
app.use(express.json()); // Middleware para parsear corpos de requisição JSON

const PORT = process.env.PORT || 3000;
const API_SECRET_KEY = process.env.API_SECRET_KEY;

// --- Middleware de Autenticação ---
// Protege os endpoints de comando, garantindo que apenas serviços autorizados possam usá-los.
const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const providedSecret = req.headers['authorization'];
    if (!API_SECRET_KEY || providedSecret !== `Bearer ${API_SECRET_KEY}`) {
        return res.status(401).json({ status: 'error', message: 'Não autorizado.' });
    }
    next();
};


// --- Endpoints da API ---

// Endpoint para verificação de saúde (usado pelo Cron Job para manter o serviço vivo)
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Músculo está vivo e respondendo.' });
});

// Endpoint para enviar mensagens (usado pelo GitHub Actions)
app.post('/send-message', authMiddleware, async (req, res) => {
    const { groupId, message } = req.body;

    if (!groupId || !message) {
        return res.status(400).json({ status: 'error', message: 'groupId e message são obrigatórios.' });
    }

    if (!botContext.sock) {
        return res.status(503).json({ status: 'error', message: 'Bot não está conectado ao WhatsApp ainda.' });
    }

    try {
        // A função sendMessage retorna o objeto da mensagem enviada, que pode ser útil para log.
        const result = await botContext.sock.sendMessage(groupId, message);
        console.log(`Mensagem enviada para ${groupId} por ordem da API.`);
        res.status(200).json({ status: 'ok', message: 'Mensagem enviada com sucesso.', data: result });
    } catch (error) {
        console.error("Erro ao enviar mensagem via API:", error);
        res.status(500).json({ status: 'error', message: 'Falha ao enviar a mensagem.', details: error });
    }
});

// Endpoint para remover um usuário de um grupo (usado pela Cloudflare)
app.post('/remove-user', authMiddleware, async (req, res) => {
    const { groupId, userId } = req.body;

    if (!groupId || !userId) {
        return res.status(400).json({ status: 'error', message: 'groupId e userId são obrigatórios.' });
    }

    if (!botContext.sock) {
        return res.status(503).json({ status: 'error', message: 'Bot não está conectado ao WhatsApp ainda.' });
    }

    try {
        // A função groupParticipantsUpdate requer um array de user IDs.
        await botContext.sock.groupParticipantsUpdate(groupId, [userId], 'remove');
        console.log(`Usuário ${userId} removido de ${groupId} por ordem da API.`);
        res.status(200).json({ status: 'ok', message: 'Usuário removido com sucesso.' });
    } catch (error) {
        console.error("Erro ao remover usuário via API:", error);
        res.status(500).json({ status: 'error', message: 'Falha ao remover o usuário.', details: error });
    }
});


// --- Inicialização do Servidor ---
app.listen(PORT, () => {
    console.log(`Músculo (Servidor Express) escutando na porta ${PORT}. Pronto para receber heartbeats e comandos.`);
});