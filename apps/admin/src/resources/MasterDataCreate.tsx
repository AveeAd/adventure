import { Create, useForm } from '@refinedev/antd';
import { Form } from 'antd';
import { MasterDataFormFields } from './MasterDataForm';
import type { MasterDataResourceConfig } from './config';

export const MasterDataCreate = ({ config }: { config: MasterDataResourceConfig }) => {
  const { formProps, saveButtonProps } = useForm({ resource: config.resource, action: 'create' });

  return (
    <Create resource={config.resource} saveButtonProps={saveButtonProps} title={`Create ${config.label}`}>
      <Form {...formProps} layout="vertical">
        <MasterDataFormFields config={config} />
      </Form>
    </Create>
  );
};
