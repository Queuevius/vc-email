
import fs from 'fs';
import path from 'path';
import { EmailService } from '../services/emailService';

// Load env vars
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
    console.log('Loading .env file from:', envPath);
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
} else {
    console.error('.env file not found!');
    process.exit(1);
}

async function main() {
    console.log('Testing email sending...');
    console.log(`Host: ${process.env.EMAIL_SERVER_HOST}`);
    console.log(`User: ${process.env.EMAIL_SERVER_USER}`);

    if (!process.env.EMAIL_SERVER_HOST || process.env.EMAIL_SERVER_HOST === 'localhost') {
        console.warn('WARNING: Host is localhost or undefined. This might not send a real email.');
    }

    const emailService = new EmailService();

    try {
        const result = await emailService.sendEmail({
            from: process.env.EMAIL_SERVER_USER!,
            to: 'sahilkhan1432k@gmail.com',
            subject: 'Test Email from VC Email System',
            text: 'This is a test email sent from the VC Email System manual test script to verify SMTP configuration.',
            html: '<div style="font-family: sans-serif; padding: 20px;"><h2>VC Email Test</h2><p>This is a test email sent from the <strong>VC Email System</strong> manual test script to verify SMTP configuration.</p><p>If you received this, the SMTP settings are correct.</p></div>',
        }, 'manual-test-user');

        console.log('Email sent successfully!');
        console.log('Message ID:', result.messageId);
        console.log('Details:', result);
    } catch (error) {
        console.error('Failed to send email:', error);
    }
}

main();
