import { useSelect } from '@refinedev/antd';
import { Form, Input, InputNumber, Select } from 'antd';
import { useTranslation } from 'react-i18next';
import type { FieldConfig, MasterDataResourceConfig } from './config';

const SelfSelectItem = ({ field, resource }: { field: FieldConfig & { kind: 'self-select' }; resource: string }) => {
  const { t } = useTranslation('resources');
  const { selectProps } = useSelect({
    resource,
    optionLabel: (item) => item[field.optionLabel],
    pagination: { mode: 'off' },
  });
  return (
    <Form.Item label={t(`fields.${field.name}`, { defaultValue: field.label })} name={field.name}>
      <Select {...selectProps} allowClear />
    </Form.Item>
  );
};

export const MasterDataFormFields = ({ config }: { config: MasterDataResourceConfig }) => {
  const { t } = useTranslation('resources');

  return (
    <>
      {config.fields.map((field) => {
        const label = t(`fields.${field.name}`, { defaultValue: field.label });
        const rules =
          'required' in field && field.required ? [{ required: true, message: `${label} is required` }] : [];

        if (field.kind === 'self-select') {
          return <SelfSelectItem key={field.name} field={field} resource={config.resource} />;
        }

        if (field.kind === 'number') {
          return (
            <Form.Item key={field.name} label={label} name={field.name} rules={rules}>
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
          );
        }

        return (
          <Form.Item key={field.name} label={label} name={field.name} rules={rules}>
            <Input />
          </Form.Item>
        );
      })}
    </>
  );
};
