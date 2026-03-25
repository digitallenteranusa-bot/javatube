import router from '@adonisjs/core/services/router';

router.get('/json', async () => {
    return { message: 'Hello World' };
});

import { promises as fs } from 'node:fs';

router.post('/form', async ({ request }) => {
    return { field1: request.input('field1') };
});

router.post('/file', async ({ request }) => {
    const file = request.file('file');
    let bufferLength = 0;
    if (file?.tmpPath) {
        const buffer = await fs.readFile(file.tmpPath);
        bufferLength = buffer.length;
    }
    return { filename: file?.clientName, size: file?.size, bufferSize: bufferLength };
});
