import { Module } from '@nestjs/common'
import { CatalogModule } from '../catalog/catalog.module'
import { BookingController } from './booking.controller'
import { BookingRepository } from './booking.repository'
import { BookingService } from './booking.service'

@Module({
  imports: [CatalogModule],
  controllers: [BookingController],
  providers: [BookingService, BookingRepository],
})
export class BookingModule {}
