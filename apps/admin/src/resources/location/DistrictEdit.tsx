import { Edit, useForm } from '@refinedev/antd';
import { Form } from 'antd';
import { useTranslation } from 'react-i18next';
import { DistrictFields } from './DistrictFields';

export const DistrictEdit = () => {
  const { formProps, saveButtonProps } = useForm({ resource: 'districts', action: 'edit' });
  const { t } = useTranslation(['common', 'resources']);

  return (
    <Edit
      resource="districts"
      saveButtonProps={saveButtonProps}
      title={t('common:editResourceTitle', { resource: t('resources:districts.label') })}
    >
      <Form {...formProps} layout="vertical">
        <DistrictFields />
      </Form>
    </Edit>
  );
};
