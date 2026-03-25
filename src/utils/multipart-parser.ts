export interface ParsedMultipart {
	name: string;
	isText: boolean;
	isFile: boolean;
	filename?: string;
	mediaType?: string;
	content: Buffer;
	text?: string;
}

export function parseMultipart(
	data: Buffer,
	boundary: string,
): ParsedMultipart[] {
	const delimiter = Buffer.from(`--${boundary}`);
	const endDelimiter = Buffer.from(`--${boundary}--`);
	const multipart: ParsedMultipart[] = [];

	let offset = data.indexOf(delimiter);
  
	while (offset !== -1) {
		// Lewati delimiter dan \r\n
		offset += delimiter.length + 2;

		// Cek apakah sudah sampai akhir (end delimiter)
		if (data.subarray(offset, offset + 2).toString() === '--') break;

		// Cari batas antara Header dan Body (\r\n\r\n)
		const headerEnd = data.indexOf('\r\n\r\n', offset);
		if (headerEnd === -1) break;

		const rawHeaders = data.subarray(offset, headerEnd).toString().split('\r\n');
		const nextDelimiter = data.indexOf(delimiter, headerEnd);
		if (nextDelimiter === -1) break;

		// Ambil Body secara presisi (tanpa trim/string conversion)
		// Kurangi 2 byte untuk menghilangkan \r\n sebelum boundary berikutnya
		const body = data.subarray(headerEnd + 4, nextDelimiter - 2);

		let name = '';
		let filename: string | undefined;
		let contentType: string | undefined;

		for (const header of rawHeaders) {
			const [key, ...v] = header.split(':');
			const lowerKey = key?.trim().toLowerCase();
			const value = v.join(':').trim();

			if (lowerKey === 'content-disposition') {
				if (value.includes('name="'))
					name = value.split('name="')[1]?.split('"')[0] ?? "";
				if (value.includes('filename="'))
					filename = value.split('filename="')[1]?.split('"')[0];
			}
			if (lowerKey === 'content-type') contentType = value;
		}

		if (filename) {
			multipart.push({
				name,
				isText: false,
				isFile: true,
				filename,
				mediaType: contentType || 'application/octet-stream',
				content: body,
			});
		} else {
			multipart.push({
				name,
				isText: true,
				isFile: false,
				text: body.toString(),
				content: body,
			});
		}

		offset = nextDelimiter;
	}

	return multipart;
}
