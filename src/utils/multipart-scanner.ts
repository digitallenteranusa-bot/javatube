export interface PartAddress {
	name: string;
	filename?: string;
	contentType?: string;
	start: number;
	end: number;
}

export function scanMultipart(buffer: Buffer, boundary: string): PartAddress[] {
	const addresses: PartAddress[] = [];
	const delimiter = `--${boundary}`;
	let offset = 0;

	while (true) {
		const startIdx = buffer.indexOf(delimiter, offset);
		if (startIdx === -1) break;

		const headerStart = startIdx + delimiter.length + 2; // ? +2 for \r\n
		const bodyStart = buffer.indexOf('\r\n\r\n', headerStart);
		if (bodyStart === -1) break;

		const nextBoundary = buffer.indexOf(delimiter, bodyStart);
		if (nextBoundary === -1) break;

		const headerRaw = buffer.toString('utf8', headerStart, bodyStart);
		const nameMatch = headerRaw.match(/name="([^"]+)"/);
		const fileMatch = headerRaw.match(/filename="([^"]+)"/);
		const typeMatch = headerRaw.match(/Content-Type:\s*([^\r\n]+)/i);

		if (nameMatch) {
			addresses.push({
				name: nameMatch[1] || '',
				filename: fileMatch ? fileMatch[1] : undefined,
				contentType: typeMatch ? typeMatch[1] : undefined,
				start: bodyStart + 4,
				end: nextBoundary - 2, // ? -2 for \r\n
			});
		}

		offset = nextBoundary;
	}
	return addresses;
}
