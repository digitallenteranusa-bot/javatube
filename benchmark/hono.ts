import { Hono } from 'hono';

const app = new Hono();

app.get('/json', (c) => {
    return c.json({ message: 'Hello World' });
});

app.post('/form', async (c) => {
    const body = await c.req.parseBody();
    return c.json({ field1: body['field1'] });
});

app.post('/file', async (c) => {
    const body = await c.req.parseBody();
    const file = body['file'] as File;
    const buffer = await file.arrayBuffer();
    return c.json({ filename: file?.name, size: file?.size, bufferSize: buffer.byteLength });
});

console.log("Hono started on port 3006");

export default {
    port: 3006,
    fetch: app.fetch,
};
