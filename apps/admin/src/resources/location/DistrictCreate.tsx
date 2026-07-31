import { Create, useForm } from '@refinedev/antd';
import { Form } from 'antd';
import { useTranslation } from 'react-i18next';
import { DistrictFields } from './DistrictFields';

export const DistrictCreate = () => {
  const { formProps, saveButtonProps } = useForm({ resource: 'districts', action: 'create' });
  const { t } = useTranslation(['common', 'resources']);

  return (
    <Create
      resource="districts"
      saveButtonProps={saveButtonProps}
      title={t('common:createResourceTitle', { resource: t('resources:districts.label') })}
    >
      <Form {...formProps} layout="vertical">
        <DistrictFields />
      </Form>
    </Create>
  );
};
