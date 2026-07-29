export interface TextFieldConfig {
  kind: 'text';
  name: string;
  label: string;
  required?: boolean;
}

export interface NumberFieldConfig {
  kind: 'number';
  name: string;
  label: string;
  required?: boolean;
}

export interface SelfSelectFieldConfig {
  kind: 'self-select';
  name: string;
  label: string;
  optionLabel: string;
}

export type FieldConfig = TextFieldConfig | NumberFieldConfig | SelfSelectFieldConfig;

export interface MasterDataResourceConfig {
  resource: string;
  label: string;
  fields: FieldConfig[];
  listColumns: string[];
}

export const activityTypeConfig: MasterDataResourceConfig = {
  resource: 'activity-types',
  label: 'Activity Types',
  fields: [
    { kind: 'text', name: 'name', label: 'Name', required: true },
    { kind: 'text', name: 'slug', label: 'Slug', required: true },
    { kind: 'text', name: 'description', label: 'Description' },
    { kind: 'number', name: 'sortOrder', label: 'Sort order' },
    { kind: 'self-select', name: 'parentId', label: 'Parent activity type', optionLabel: 'name' },
  ],
  listColumns: ['name', 'slug', 'sortOrder', 'isActive'],
};

export const difficultyLevelConfig: MasterDataResourceConfig = {
  resource: 'difficulty-levels',
  label: 'Difficulty Levels',
  fields: [
    { kind: 'text', name: 'name', label: 'Name', required: true },
    { kind: 'text', name: 'slug', label: 'Slug', required: true },
    { kind: 'text', name: 'description', label: 'Description' },
    { kind: 'number', name: 'sortOrder', label: 'Sort order' },
  ],
  listColumns: ['name', 'slug', 'sortOrder', 'isActive'],
};

export const seasonConfig: MasterDataResourceConfig = {
  resource: 'seasons',
  label: 'Seasons',
  fields: [
    { kind: 'text', name: 'name', label: 'Name', required: true },
    { kind: 'text', name: 'slug', label: 'Slug', required: true },
    { kind: 'text', name: 'description', label: 'Description' },
    { kind: 'number', name: 'sortOrder', label: 'Sort order' },
  ],
  listColumns: ['name', 'slug', 'sortOrder', 'isActive'],
};

export const countryConfig: MasterDataResourceConfig = {
  resource: 'countries',
  label: 'Countries',
  fields: [
    { kind: 'text', name: 'name', label: 'Name', required: true },
    { kind: 'text', name: 'isoCode', label: 'ISO code', required: true },
  ],
  listColumns: ['name', 'isoCode', 'isActive'],
};

export const languageConfig: MasterDataResourceConfig = {
  resource: 'languages',
  label: 'Languages',
  fields: [
    { kind: 'text', name: 'name', label: 'Name', required: true },
    { kind: 'text', name: 'isoCode', label: 'ISO code', required: true },
    { kind: 'number', name: 'sortOrder', label: 'Sort order' },
  ],
  listColumns: ['name', 'isoCode', 'sortOrder', 'isActive'],
};

export const spotTypeConfig: MasterDataResourceConfig = {
  resource: 'spot-types',
  label: 'Spot Types',
  fields: [
    { kind: 'text', name: 'name', label: 'Name', required: true },
    { kind: 'text', name: 'slug', label: 'Slug', required: true },
    { kind: 'text', name: 'description', label: 'Description' },
    { kind: 'number', name: 'sortOrder', label: 'Sort order' },
  ],
  listColumns: ['name', 'slug', 'sortOrder', 'isActive'],
};
