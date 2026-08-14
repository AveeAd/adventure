import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateThreadReplyDto {
  @IsString()
  @MinLength(1)
  content: string;

  @IsOptional()
  @IsUUID()
  parentReplyId?: string;
}
