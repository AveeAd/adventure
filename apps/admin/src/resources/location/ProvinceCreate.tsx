import { Create, useForm } from '@refinedev/antd';
import { Form } from 'antd';
import { useTranslation } from 'react-i18next';
import { ProvinceFields } from './ProvinceFields';

export const ProvinceCreate = () => {
  const { formProps, saveButtonProps } = useForm({ resource: 'provinces', action: 'create' });
  const { t } = useTranslation(['common', 'resources']);

  return (
    <Create
      resource="provinces"
      saveButtonProps={saveButtonProps}
      title={t('common:createResourceTitle', { resource: t('resources:provinces.label') })}
    >
      <Form {...formProps} layout="vertical">
        <ProvinceFields />
      </Form>
    </Create>
  );
};
