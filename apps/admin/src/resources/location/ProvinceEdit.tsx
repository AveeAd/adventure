import { Edit, useForm } from '@refinedev/antd';
import { Form } from 'antd';
import { useTranslation } from 'react-i18next';
import { ProvinceFields } from './ProvinceFields';

export const ProvinceEdit = () => {
  const { formProps, saveButtonProps } = useForm({ resource: 'provinces', action: 'edit' });
  const { t } = useTranslation(['common', 'resources']);

  return (
    <Edit
      resource="provinces"
      saveButtonProps={saveButtonProps}
      title={t('common:editResourceTitle', { resource: t('resources:provinces.label') })}
    >
      <Form {...formProps} layout="vertical">
        <ProvinceFields />
      </Form>
    </Edit>
  );
};
