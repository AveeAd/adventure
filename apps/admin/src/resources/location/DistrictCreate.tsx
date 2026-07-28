import { Create, useForm } from '@refinedev/antd';
import { Form } from 'antd';
import { DistrictFields } from './DistrictFields';

export const DistrictCreate = () => {
  const { formProps, saveButtonProps } = useForm({ resource: 'districts', action: 'create' });

  return (
    <Create resource="districts" saveButtonProps={saveButtonProps} title="Create District">
      <Form {...formProps} layout="vertical">
        <DistrictFields />
      </Form>
    </Create>
  );
};
