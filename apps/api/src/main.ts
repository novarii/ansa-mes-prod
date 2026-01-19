/**
 * Ansa MES API Bootstrap
 *
 * NestJS v11 API with validation, exception handling, and OpenAPI documentation.
 *
 * @see specs/operational-standards.md
 */
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app/app.module';
import { GlobalExceptionFilter } from './shared/filters';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    // NestJS v11: Built-in JSON logging
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // Global validation pipe with class-transformer integration
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    })
  );

  // Global exception filter for consistent error handling
  app.useGlobalFilters(new GlobalExceptionFilter());

  // CORS for web app origin
  app.enableCors({
    origin: process.env['CORS_ORIGIN'] ?? 'http://localhost:4200',
    credentials: true,
  });

  // OpenAPI/Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Ansa MES API')
    .setDescription('Manufacturing Execution System API for ANSA Ambalaj')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('work-orders', 'Work order management')
    .addTag('production', 'Production entry and activity tracking')
    .addTag('team', 'Team view and worker status')
    .addTag('calendar', 'Calendar view for work orders')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env['PORT'] ?? 3000;
  await app.listen(port);

  Logger.log(
    `Application is running on: http://localhost:${port}/${globalPrefix}`
  );
  Logger.log(`Swagger docs available at: http://localhost:${port}/api/docs`);
}

bootstrap();
