import { Edit, useForm } from '@refinedev/antd';
import { Form } from 'antd';
import { useTranslation } from 'react-i18next';
import { MasterDataFormFields } from './MasterDataForm';
import type { MasterDataResourceConfig } from './config';

export const MasterDataEdit = ({ config }: { config: MasterDataResourceConfig }) => {
  const { formProps, saveButtonProps } = useForm({ resource: config.resource, action: 'edit' });
  const { t } = useTranslation(['common', 'resources']);
  const resourceLabel = t(`resources:${config.resource}.label`, { defaultValue: config.label });

  return (
    <Edit resource={config.resource} saveButtonProps={saveButtonProps} title={t('editResourceTitle', { resource: resourceLabel })}>
      <Form {...formProps} layout="vertical">
        <MasterDataFormFields config={config} />
      </Form>
    </Edit>
  );
};
