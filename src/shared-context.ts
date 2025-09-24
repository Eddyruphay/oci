import { WASocket } from '@whiskeysockets/baileys';

/**
 * O contexto compartilhado para o bot.
 * Isso permite que diferentes partes da aplicação (como a API Express e o listener do Baileys)
 * acessem a mesma instância do socket do WhatsApp.
 */
export const botContext: { sock?: WASocket } = {};
