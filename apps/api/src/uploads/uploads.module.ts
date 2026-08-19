import { Module } from '@nestjs/common';
import { ImageProcessorService } from './image-processor.service';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

@Module({
  controllers: [UploadsController],
  providers: [UploadsService, ImageProcessorService],
  exports: [UploadsService],
})
export class UploadsModule {}
