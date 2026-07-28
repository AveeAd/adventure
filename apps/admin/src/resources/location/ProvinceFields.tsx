import { useSelect } from '@refinedev/antd';
import { Form, Input, Select } from 'antd';

export const ProvinceFields = () => {
  const { selectProps: countrySelectProps } = useSelect({
    resource: 'countries',
    optionLabel: 'name',
    pagination: { mode: 'off' },
  });

  return (
    <>
      <Form.Item label="Country" name="countryId" rules={[{ required: true }]}>
        <Select {...countrySelectProps} />
      </Form.Item>
      <Form.Item label="Name" name="name" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item label="Slug" name="slug" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
    </>
  );
};
