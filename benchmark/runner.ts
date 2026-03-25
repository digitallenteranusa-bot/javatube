import autocannon from 'autocannon';
import { spawn } from 'node:child_process';
import { writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const imageBuffer = readFileSync(join(process.cwd(), '../.github/images/gaman.png'));

const frameworks = [
    { name: 'GamanJS', command: 'bun run gaman.ts', port: 3001 },
    { name: 'ExpressJS', command: 'bun run express.ts', port: 3002 },
    { name: 'NestJS', command: 'bun run nestjs.ts', port: 3003 },
    { name: 'ElysiaJS', command: 'bun run elysia.ts', port: 3004 },
    { name: 'AdonisJS', command: 'node build/bin/server.js', port: 3005, cwd: 'adonis-app', env: { PORT: '3005', NODE_ENV: 'production', HOST: '127.0.0.1', LOG_LEVEL: 'info', APP_KEY: 'a-very-long-and-secure-app-key-here', APP_URL: 'http://localhost:3005', SESSION_DRIVER: 'cookie' } },
    { name: 'Hono', command: 'bun run hono.ts', port: 3006 },
];

const duration = 5; // seconds per test
const connections = 100;

const runTest = (url: string, method: string, body?: string | Buffer, headers?: Record<string, string>) => {
    return new Promise<any>((resolve, reject) => {
        autocannon({
            url,
            connections,
            duration,
            method: method as any,
            body,
            headers,
        }, (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
};

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

async function main() {
    console.log("Starting Benchmark Suite...");
    const results: Record<string, any> = {};

    for (const fw of frameworks) {
        console.log(`\n===========================================`);
        console.log(`Starting ${fw.name}...`);
        
        const args = fw.command.split(' ');
        const bin = args[0];
        const processArgs = args.slice(1);
        
        const serverProcess = spawn(bin, processArgs, { 
            cwd: fw.cwd ? join(process.cwd(), fw.cwd) : process.cwd(), 
            stdio: 'inherit',
            env: { ...process.env, ...(fw.env || {}) }
        });

        await delay(3000); // Wait for the server to bind

        try {
            console.log(`\n[${fw.name}] Testing GET /json`);
            const jsonRes = await runTest(`http://localhost:${fw.port}/json`, 'GET');
            
            console.log(`\n[${fw.name}] Testing POST /form`);
            const formRes = await runTest(`http://localhost:${fw.port}/form`, 'POST', 'field1=value1&field2=value2', { 'content-type': 'application/x-www-form-urlencoded' });
            
            const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
            const headerStr = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="gaman.png"\r\nContent-Type: image/png\r\n\r\n`;
            const tailStr = `\r\n--${boundary}--\r\n`;
            const multipartBody = Buffer.concat([
                Buffer.from(headerStr),
                imageBuffer,
                Buffer.from(tailStr)
            ]);
            
            console.log(`\n[${fw.name}] Testing POST /file`);
            const fileRes = await runTest(`http://localhost:${fw.port}/file`, 'POST', multipartBody, { 'content-type': `multipart/form-data; boundary=${boundary}` });
            
            results[fw.name] = {
                'GET JSON (req/s)': jsonRes.requests.average,
                'POST Form (req/s)': formRes.requests.average,
                'POST File (req/s)': fileRes.requests.average,
            };
            
        } catch (err) {
            console.error(`Error benchmarking ${fw.name}:`, err);
        }

        console.log(`Stopping ${fw.name}...`);
        serverProcess.kill('SIGINT');
        await delay(1000); // Wait for the port to be freed
    }

    console.table(results);

    const printChart = (title: string, metric: string, data: Record<string, any>) => {
        console.log(`\n--- ${title} ---`);
        const max = Math.max(...Object.values(data).map(r => r[metric] || 0));
        for (const [name, result] of Object.entries(data)) {
            const val = result[metric] || 0;
            const barLen = max > 0 ? Math.round((val / max) * 40) : 0;
            const bar = '█'.repeat(barLen);
            console.log(`${name.padStart(10)} | ${val.toFixed(2).padStart(10)} req/s | ${bar}`);
        }
    };

    printChart('GET JSON', 'GET JSON (req/s)', results);
    printChart('POST Form', 'POST Form (req/s)', results);
    printChart('POST File', 'POST File (req/s)', results);

    writeFileSync('results.json', JSON.stringify(results, null, 2));
    console.log("\nResults saved to results.json");
    process.exit(0);
}

main().catch(console.error);
