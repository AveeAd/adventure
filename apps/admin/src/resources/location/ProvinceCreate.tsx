import { Create, useForm } from '@refinedev/antd';
import { Form } from 'antd';
import { ProvinceFields } from './ProvinceFields';

export const ProvinceCreate = () => {
  const { formProps, saveButtonProps } = useForm({ resource: 'provinces', action: 'create' });

  return (
    <Create resource="provinces" saveButtonProps={saveButtonProps} title="Create Province">
      <Form {...formProps} layout="vertical">
        <ProvinceFields />
      </Form>
    </Create>
  );
};
