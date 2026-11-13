import { Module } from '@nestjs/common';
import { RobotsController } from './robots.controller.js';

@Module({
  controllers: [RobotsController],
})
export class RobotsModule {}
