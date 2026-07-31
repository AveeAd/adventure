import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsNumber, registerDecorator, ValidationOptions } from 'class-validator';

// [lng, lat] within real-world bounds - the bbox endpoints already reject
// obviously-wrong query params (see BboxQueryDto); this closes the same gap
// on write, per ACTIVITY_TRACKS.md's prerequisite-fixes list ("no element
// type check, no lat/lng range check, no max size").
function IsLngLatPair(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isLngLatPair',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return (
            Array.isArray(value) &&
            value.length === 2 &&
            typeof value[0] === 'number' &&
            typeof value[1] === 'number' &&
            value[0] >= -180 &&
            value[0] <= 180 &&
            value[1] >= -90 &&
            value[1] <= 90
          );
        },
        defaultMessage(): string {
          return '$property must be a [longitude, latitude] pair within valid ranges';
        },
      },
    });
  };
}

function IsLngLatPairArray(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isLngLatPairArray',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          if (!Array.isArray(value)) return false;
          return value.every(
            (pair) =>
              Array.isArray(pair) &&
              pair.length === 2 &&
              typeof pair[0] === 'number' &&
              typeof pair[1] === 'number' &&
              pair[0] >= -180 &&
              pair[0] <= 180 &&
              pair[1] >= -90 &&
              pair[1] <= 90,
          );
        },
        defaultMessage(): string {
          return 'Every coordinate in $property must be a [longitude, latitude] pair within valid ranges';
        },
      },
    });
  };
}

export class PointGeometryDto {
  @IsIn(['Point'])
  type: string;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsNumber({}, { each: true })
  @IsLngLatPair()
  coordinates: number[];
}

export class LineStringGeometryDto {
  @IsIn(['LineString'])
  type: string;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(100000)
  @IsLngLatPairArray()
  coordinates: number[][];
}
