import { Create, useForm } from '@refinedev/antd';
import { Form } from 'antd';
import { useTranslation } from 'react-i18next';
import { MunicipalityFields } from './MunicipalityFields';

export const MunicipalityCreate = () => {
  const { formProps, saveButtonProps } = useForm({ resource: 'municipalities', action: 'create' });
  const { t } = useTranslation(['common', 'resources']);

  return (
    <Create
      resource="municipalities"
      saveButtonProps={saveButtonProps}
      title={t('common:createResourceTitle', { resource: t('resources:municipalities.label') })}
    >
      <Form {...formProps} layout="vertical">
        <MunicipalityFields />
      </Form>
    </Create>
  );
};
