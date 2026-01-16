import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MindfulnessService } from './mindfulness.service';
import { MindfulnessController } from './mindfulness.controller';
import { Mindfulness } from '../entities/mindfulness.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Mindfulness])],
  controllers: [MindfulnessController],
  providers: [MindfulnessService],
  exports: [MindfulnessService],
})
export class MindfulnessModule { }
