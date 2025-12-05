import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // makes process.env available everywhere
    }),
    // other modules like AuthModule can be added here later
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
