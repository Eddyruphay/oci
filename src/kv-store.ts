import { AuthenticationCreds, AuthenticationState, SignalKeyPair, initAuthCreds } from '@whiskeysockets/baileys';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

const NAMESPACE_ID = '4a7d6cb32b3a4040aba70aed54064408'; // ID do BAILEYS_SESSION_KV

const readKV = async (key: string): Promise<string | null> => {
    try {
        const { stdout } = await execPromise(`wrangler kv key get ${key} --namespace-id=${NAMESPACE_ID}`);
        return stdout.trim() === 'null' ? null : stdout.trim();
    } catch (error: any) {
        if (error.stderr && error.stderr.includes('404 Not Found')) {
            return null; // Key not found
        }
        console.error(`Error reading from KV for key ${key}:`, error);
        return null;
    }
};

const writeKV = async (key: string, value: string): Promise<void> => {
    try {
        await execPromise(`wrangler kv key put ${key} --namespace-id=${NAMESPACE_ID} -- ${value}`);
    } catch (error) {
        console.error(`Error writing to KV for key ${key}:`, error);
    }
};

const deleteKV = async (key: string): Promise<void> => {
    try {
        await execPromise(`wrangler kv key delete ${key} --namespace-id=${NAMESPACE_ID}`);
    } catch (error) {
        console.error(`Error deleting from KV for key ${key}:`, error);
    }
};

export const useKVAuthState = async (): Promise<{ state: AuthenticationState; saveCreds: () => Promise<void> }> => {
    const creds: AuthenticationCreds = (await readKV('creds')) ? JSON.parse(await readKV('creds') || '{}') : initAuthCreds();

    return {
        state: {
            creds,
            keys: {
                get: async (type: string, ids: string[]) => {
                    const data: { [key: string]: any } = {};
                    for (const id of ids) {
                        let value = await readKV(`${type}-${id}`);
                        if (value) {
                            data[id] = JSON.parse(value);
                        }
                    }
                    return data;
                },
                set: async (data: any) => {
                    for (const type in data) {
                        for (const id in data[type]) {
                            const value = JSON.stringify(data[type][id]);
                            await writeKV(`${type}-${id}`, value);
                        }
                    }
                },
                del: async (keys: string[]) => {
                    for (const key of keys) {
                        await deleteKV(key);
                    }
                },
            },
        },
        saveCreds: async () => {
            await writeKV('creds', JSON.stringify(creds));
        },
    };
};
