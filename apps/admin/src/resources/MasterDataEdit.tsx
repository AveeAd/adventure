import { Edit, useForm } from '@refinedev/antd';
import { Form } from 'antd';
import { MasterDataFormFields } from './MasterDataForm';
import type { MasterDataResourceConfig } from './config';

export const MasterDataEdit = ({ config }: { config: MasterDataResourceConfig }) => {
  const { formProps, saveButtonProps } = useForm({ resource: config.resource, action: 'edit' });

  return (
    <Edit resource={config.resource} saveButtonProps={saveButtonProps} title={`Edit ${config.label}`}>
      <Form {...formProps} layout="vertical">
        <MasterDataFormFields config={config} />
      </Form>
    </Edit>
  );
};
