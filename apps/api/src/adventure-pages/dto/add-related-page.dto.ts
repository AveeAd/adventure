import { IsUUID } from 'class-validator';

export class AddRelatedPageDto {
  @IsUUID()
  relatedPageId: string;
}
