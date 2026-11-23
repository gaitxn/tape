import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Aumentar el límite del payload para permitir scripts DSL extensos
  app.use(json({ limit: '5mb' }));
  app.use(urlencoded({ extended: true, limit: '5mb' }));

  // Permite que el front (Angular, puerto 4200) llame a la API
  app.enableCors({
    origin: '*', // Usa origin: '*' para permitir todos
  });
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
