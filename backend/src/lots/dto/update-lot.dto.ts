import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateLotDto } from './create-lot.dto';

// Lot updates cannot change product_id or qty_initial (use stock movements instead)
export class UpdateLotDto extends PartialType(
  OmitType(CreateLotDto, ['product_id', 'qty_initial'] as const),
) {}
