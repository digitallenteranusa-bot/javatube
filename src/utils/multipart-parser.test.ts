import { describe, it, expect } from 'bun:test';
import * as fs from 'fs';
import { parseMultipart } from './multipart-parser';
import { GFile } from '../context/formdata/file';

// multipart.ts
type FilePart = {
	filename: string;
	contentType: string;
	content: string | Buffer;
};

type FormValue = string | FilePart;

export class MultipartForm {
	private boundary: string;
	private parts: [string, FormValue][] = [];

	constructor(boundary?: string) {
		this.boundary =
			boundary || `----GamanBoundary${Math.random().toString(16).slice(2)}`;
	}

	public append(name: string, value: FormValue) {
		this.parts.push([name, value]);
	}

	public build(): Buffer {
		const chunks: Buffer[] = [];
		const encoder = new TextEncoder();

		for (const [name, value] of this.parts) {
			chunks.push(Buffer.from(`--${this.boundary}\r\n`));

			if (typeof value === 'string') {
				chunks.push(
					Buffer.from(`Content-Disposition: form-data; name="${name}"\r\n\r\n`),
				);
				chunks.push(Buffer.from(`${value}\r\n`));
			} else {
				chunks.push(
					Buffer.from(
						`Content-Disposition: form-data; name="${name}"; filename="${value.filename}"\r\n`,
					),
				);
				chunks.push(Buffer.from(`Content-Type: ${value.contentType}\r\n\r\n`));
				chunks.push(
					Buffer.isBuffer(value.content)
						? value.content
						: Buffer.from(value.content as any),
				);
				chunks.push(Buffer.from(`\r\n`));
			}
		}

		chunks.push(Buffer.from(`--${this.boundary}--\r\n`));
		return Buffer.concat(chunks);
	}
}
describe('Multipart Parser Benchmark', async () => {
	// Load file di awal test
	const fileArrayBuffer = await Bun.file(
		'.github/images/gaman.png',
	).arrayBuffer();
	const fileBuffer = Buffer.from(fileArrayBuffer);

	const form = new MultipartForm('WebKitFormBoundaryABC123');
	form.append('avatar', {
		filename: 'avatar.png',
		contentType: 'image/png',
		content: fileBuffer,
	});
	form.append('username', 'gaman_dev');

	const input = form.build();
	const boundary = 'WebKitFormBoundaryABC123';

	it('should parse multipart data correctly and fast', () => {
		const iterations = 100; // Jalankan 100 kali untuk rata-rata
		const results: number[] = [];

		for (let i = 0; i < iterations; i++) {
			const start = performance.now();
			const parsed = parseMultipart(input, boundary);
			const end = performance.now();
			results.push(end - start);

			// Pastikan data valid di iterasi terakhir
			if (i === iterations - 1) {
				expect(parsed.length).toBeGreaterThan(0);
				expect(parsed[0].filename).toBe('avatar.png');
			}
		}

		const avg = results.reduce((a, b) => a + b) / iterations;
		console.log(`\n🚀 GamanJS Multipart Benchmark:`);
		console.log(`   Average: ${avg.toFixed(4)} ms`);
		console.log(`   Fastest: ${Math.min(...results).toFixed(4)} ms`);
		console.log(`   Input Size: ${(input.length / 1024).toFixed(2)} KB`);
	});

	// it('should save file correctly using FormDataFile', async () => {
	// 	const result = parseMultipart(input, boundary);
	// 	const avatar = result.find((p) => p.filename === 'avatar.png');

	// 	if (avatar) {
	// 		// Gunakan instance FormDataFile kamu
	// 		const saver = new GFile(avatar.filename!, avatar.content);
	// 		await saver.saveTo('./test_output.png');

	// 		// Verifikasi file ada
	// 		expect(fs.existsSync('./test_output.png')).toBe(true);
	// 	}
	// });
});
