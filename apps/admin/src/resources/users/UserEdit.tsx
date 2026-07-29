import { Edit, useForm } from '@refinedev/antd';
import { Form, Select, Switch, Typography } from 'antd';

export const UserEdit = () => {
  const { formProps, saveButtonProps, query } = useForm({ resource: 'users', action: 'edit' });
  const record = query?.data?.data;

  return (
    <Edit resource="users" saveButtonProps={saveButtonProps} title="Edit user">
      <Typography.Paragraph type="secondary">{record?.email}</Typography.Paragraph>
      <Form {...formProps} layout="vertical">
        <Form.Item label="Role" name="role">
          <Select
            options={[
              { value: 'USER', label: 'User' },
              { value: 'ADMIN', label: 'Admin' },
            ]}
          />
        </Form.Item>
        <Form.Item label="Active" name="isActive" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Edit>
  );
};
