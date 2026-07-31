import { Edit, useForm } from '@refinedev/antd';
import { Form } from 'antd';
import { useTranslation } from 'react-i18next';
import { MunicipalityFields } from './MunicipalityFields';

export const MunicipalityEdit = () => {
  const { formProps, saveButtonProps } = useForm({ resource: 'municipalities', action: 'edit' });
  const { t } = useTranslation(['common', 'resources']);

  return (
    <Edit
      resource="municipalities"
      saveButtonProps={saveButtonProps}
      title={t('common:editResourceTitle', { resource: t('resources:municipalities.label') })}
    >
      <Form {...formProps} layout="vertical">
        <MunicipalityFields />
      </Form>
    </Edit>
  );
};
