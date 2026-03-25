/**
 * * Schema Buffer data Gaman IPC
 *
 * ? [PAYLOAD_SIZE(4 byte) + TYPE(1 byte) + PAYLOAD(n byte)]
 */
const HEADER_BYTE = 4; // 4 byte
const TYPE_BYTE = 1; // 1 byte

export const GamanPacker = {
	encode(payload: any): Buffer {
		let dataBuf: Buffer;
		let type: number; // ? 0=json, 1=string, 2=buffer;

		if (Buffer.isBuffer(payload)) {
			dataBuf = payload;
			type = 2;
		} else if (typeof payload === 'string') {
			dataBuf = Buffer.from(payload);
			type = 1;
		} else {
			dataBuf = Buffer.from(JSON.stringify(payload));
			type = 0;
		}

		//? Header 4 byte + Payload
		//! 4 byte pertama itu buat panjang payload
		//! karna IPC sistemnya kayak keran air jadi kadang kepotong data ga full
		//! jadi orang / bahasa lain tau data ini aslinya size nya bri jadi klo size udah 100% / complete dia bakal selesai baca data
		const packet = Buffer.alloc(HEADER_BYTE + TYPE_BYTE + dataBuf.length);

		//! write panjang payload di 4 byte pertama
		packet.writeUInt32BE(dataBuf.length + TYPE_BYTE, 0);
		packet.writeUInt8(type, HEADER_BYTE);

		//? Copy datanya setelah header
		dataBuf.copy(packet, HEADER_BYTE + TYPE_BYTE);

		return packet;
	},

	/**
	 * ! pastikan buffer yang terima HEADER_BYTE sudah di hapus
	 * ! jadi tersisa 1 byte (type) + N byte (payload)
	 *
	 * ! 4 byte (header) + 1 byte (type) + N byte (payload) = TIDAK AKAN DI TERIMA
	 * @param buffer
	 * @returns
	 */
	decode(buffer: Buffer): [type: number, payload: any] {
		const type = buffer.readUInt8(0);
		const content = buffer.subarray(1);

		switch (type) {
			case 0:
				return [0, JSON.parse(content.toString('utf8'))];
			case 1:
				return [1, content.toString('utf8')];
			case 2:
				return [2, content];
			default:
				return [2, buffer];
		}
	},

	/**
	 *
	 * Mengolah aliran data (stream) yang masuk.
	 * Fungsi ini akan mengembalikan array of payloads jika ada satu atau lebih pesan yang komplit.
	 * @param key
	 * @param rawData
	 * @param storage
	 * @returns
	 */
	feed(
		key: any,
		rawData: Buffer,
		storage: Map<any, { buffer: Buffer; targetSize: number | null }>,
	) {
		let state = storage.get(key) || {
			buffer: Buffer.alloc(0),
			targetSize: null,
		};

		state.buffer = Buffer.concat([state.buffer, rawData]);

		const messages: [type: number, payload: any][] = [];

		while (true) {
			// ? ambil payload size lewat header (4 byte) pertama
			if (state.targetSize === null) {
				if (state.buffer.length >= HEADER_BYTE) {
					state.targetSize = state.buffer.readUInt32BE(0);
					state.buffer = state.buffer.subarray(HEADER_BYTE);
				} else {
					break; //! Data belum cukup buat baca header (bahkan < 4 byte)
				}
			}

			if (
				state.targetSize !== null &&
				state.buffer.length >= state.targetSize
			) {
				const rawContent = state.buffer.subarray(0, state.targetSize);

				messages.push(this.decode(rawContent));

				// * remove buffer yan udah di proses
				state.buffer = state.buffer.subarray(state.targetSize);
				// * Reset targetSize untuk pesan berikutnya (siapa tahu ada data dempet)
				state.targetSize = null;
			} else {
				break;
			}
		}

		storage.set(key, state);

		return messages;
	},

	parseIPCMessage(
		key: any,
		rawData: Buffer,
		storage: Map<any, { buffer: Buffer; targetSize: number | null }>,
	) {
		const messages = GamanPacker.feed(key, rawData, storage);
		if (messages.length > 0) return messages;

		// fallback single chunk
		try {
			return [GamanPacker.decode(rawData)];
		} catch {}

		// fallback raw
		return [[1, rawData.toString('utf8')]];
	},
};
