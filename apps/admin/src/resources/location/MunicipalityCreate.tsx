import { Create, useForm } from '@refinedev/antd';
import { Form } from 'antd';
import { MunicipalityFields } from './MunicipalityFields';

export const MunicipalityCreate = () => {
  const { formProps, saveButtonProps } = useForm({ resource: 'municipalities', action: 'create' });

  return (
    <Create resource="municipalities" saveButtonProps={saveButtonProps} title="Create Municipality">
      <Form {...formProps} layout="vertical">
        <MunicipalityFields />
      </Form>
    </Create>
  );
};
