import { BadRequestException, Type } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

// generic controllers can't rely on decorator-emitted param type metadata to
// pick the right DTO class (it's only known at runtime, via closure), so
// validation happens explicitly here instead of through the global pipe
export async function validateDto<T extends object>(cls: Type<T>, body: unknown): Promise<T> {
  const instance = plainToInstance(cls, body);
  const errors = await validate(instance, { whitelist: true, forbidNonWhitelisted: true });
  if (errors.length > 0) {
    const messages = errors.flatMap((error) => Object.values(error.constraints ?? {}));
    throw new BadRequestException(messages);
  }
  return instance;
}
