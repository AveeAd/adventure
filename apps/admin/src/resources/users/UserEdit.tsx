import { Edit, useForm } from '@refinedev/antd';
import { Form, Select, Switch, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

export const UserEdit = () => {
  const { formProps, saveButtonProps, query } = useForm({ resource: 'users', action: 'edit' });
  const record = query?.data?.data;
  const { t } = useTranslation('resources');

  return (
    <Edit resource="users" saveButtonProps={saveButtonProps} title={t('users.editTitle')}>
      <Typography.Paragraph type="secondary">{record?.email}</Typography.Paragraph>
      <Form {...formProps} layout="vertical">
        <Form.Item label={t('users.fields.role')} name="role">
          <Select
            options={[
              { value: 'USER', label: t('users.roles.USER') },
              { value: 'MODERATOR', label: t('users.roles.MODERATOR') },
              { value: 'ADMIN', label: t('users.roles.ADMIN') },
            ]}
          />
        </Form.Item>
        <Form.Item label={t('users.fields.isActive')} name="isActive" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Edit>
  );
};
