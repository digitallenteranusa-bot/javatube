import { Elysia, t } from 'elysia';

new Elysia()
    .get('/json', () => {
        return { message: 'Hello World' };
    })
    .post('/form', ({ body }) => {
        return { field1: (body as any).field1 };
    }, {
        body: t.Any()
    })
    .post('/file', async ({ body }) => {
        const file = (body as any).file as File;
        const buffer = await file?.arrayBuffer();
        return { filename: file?.name, size: file?.size, bufferSize: buffer?.byteLength };
    })
    .listen(3004, () => {
        console.log("Elysia started on port 3004");
    });
