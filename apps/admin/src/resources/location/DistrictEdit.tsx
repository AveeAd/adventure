import { Edit, useForm } from '@refinedev/antd';
import { Form } from 'antd';
import { DistrictFields } from './DistrictFields';

export const DistrictEdit = () => {
  const { formProps, saveButtonProps } = useForm({ resource: 'districts', action: 'edit' });

  return (
    <Edit resource="districts" saveButtonProps={saveButtonProps} title="Edit District">
      <Form {...formProps} layout="vertical">
        <DistrictFields />
      </Form>
    </Edit>
  );
};
