import { NestFactory } from '@nestjs/core';
import dns from 'node:dns';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  try {
    // Prefer IPv4 DNS results to avoid ENETUNREACH when host resolves to IPv6
    // Some hosting environments lack IPv6 outbound routing.
    if (dns.setDefaultResultOrder) dns.setDefaultResultOrder('ipv4first');
  } catch (err) {
    // noop - keep startup resilient
  }
  const app = await NestFactory.create(AppModule);

  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
