import { useSelect } from '@refinedev/antd';
import { Form, Input, Select } from 'antd';
import { useTranslation } from 'react-i18next';

export const ProvinceFields = () => {
  const { selectProps: countrySelectProps } = useSelect({
    resource: 'countries',
    optionLabel: 'name',
    pagination: { mode: 'off' },
  });
  const { t } = useTranslation('resources');

  return (
    <>
      <Form.Item label={t('fields.country')} name="countryId" rules={[{ required: true }]}>
        <Select {...countrySelectProps} />
      </Form.Item>
      <Form.Item label={t('fields.name')} name="name" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
    </>
  );
};
