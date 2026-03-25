import { Controller, Get, Post, Req, Res as ResDecorator, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import multer from 'multer';
import express from 'express';

const upload = multer({ dest: '/tmp/' });

@Controller()
class AppController {
    @Get('/json')
    getJson() {
        return { message: 'Hello World' };
    }

    @Post('/form')
    postForm(@Req() req: any, @ResDecorator() res: any) {
        upload.none()(req, res, (err: any) => {
            res.json({ field1: req.body.field1 });
        });
    }

    @Post('/file')
    postFile(@Req() req: any, @ResDecorator() res: any) {
        upload.single('file')(req, res, (err: any) => {
             res.json({ filename: req.file?.originalname, size: req.file?.size, bufferSize: req.file?.size });
        });
    }
}

@Module({
    controllers: [AppController]
})
class AppModule {}

async function bootstrap() {
    const app = await NestFactory.create(AppModule, new ExpressAdapter(express()));
    await app.listen(3003);
    console.log("NestJS started on port 3003");
}
bootstrap();
