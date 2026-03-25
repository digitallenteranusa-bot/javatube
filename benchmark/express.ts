import express from 'express';
import multer from 'multer';

const app = express();
const upload = multer({ dest: '/tmp/' });

app.get('/json', (req, res) => {
    res.json({ message: 'Hello World' });
});

app.post('/form', upload.none(), (req, res) => {
    res.json({ field1: req.body.field1 });
});

app.post('/file', upload.single('file'), (req, res) => {
    res.json({ filename: req.file?.originalname, size: req.file?.size, bufferSize: req.file?.size });
});

app.listen(3002, () => {
    console.log("Express started on port 3002");
});
