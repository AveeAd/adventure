import { Edit, useForm } from '@refinedev/antd';
import { Form } from 'antd';
import { ProvinceFields } from './ProvinceFields';

export const ProvinceEdit = () => {
  const { formProps, saveButtonProps } = useForm({ resource: 'provinces', action: 'edit' });

  return (
    <Edit resource="provinces" saveButtonProps={saveButtonProps} title="Edit Province">
      <Form {...formProps} layout="vertical">
        <ProvinceFields />
      </Form>
    </Edit>
  );
};
