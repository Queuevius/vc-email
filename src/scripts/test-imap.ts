
import fs from 'fs';
import path from 'path';
import imaps from 'imap-simple';

const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach((line) => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            let value = match[2].trim();
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            process.env[key] = value;
        }
    });
}

async function main() {
    const config = {
        imap: {
            user: process.env.IMAP_USER || "",
            password: process.env.IMAP_PASSWORD || "",
            host: process.env.IMAP_HOST || "",
            port: parseInt(process.env.IMAP_PORT || "993"),
            tls: true,
            tlsOptions: { rejectUnauthorized: false },
            authTimeout: 10000,
        },
    };

    console.log('Connecting to IMAP...', config.imap.host, config.imap.port);

    try {
        const connection = await imaps.connect(config);
        console.log('IMAP Connected successfully!');
        await connection.end();
    } catch (err) {
        console.error('IMAP Connection failed:', err);
    }
}

main();
