import { Edit, useForm } from '@refinedev/antd';
import { Form } from 'antd';
import { MunicipalityFields } from './MunicipalityFields';

export const MunicipalityEdit = () => {
  const { formProps, saveButtonProps } = useForm({ resource: 'municipalities', action: 'edit' });

  return (
    <Edit resource="municipalities" saveButtonProps={saveButtonProps} title="Edit Municipality">
      <Form {...formProps} layout="vertical">
        <MunicipalityFields />
      </Form>
    </Edit>
  );
};
