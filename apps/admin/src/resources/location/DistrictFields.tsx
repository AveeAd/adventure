import { useState } from 'react';
import { Form, Input, Select } from 'antd';
import { useTranslation } from 'react-i18next';
import { useAllRows } from '../../hooks/useAllRows';

interface CountryRow {
  id: string;
  name: string;
}

interface ProvinceRow {
  id: string;
  name: string;
  countryId: string;
}

export const DistrictFields = () => {
  const [countryFilter, setCountryFilter] = useState<string>();
  const countries = useAllRows<CountryRow>('countries');
  const provinces = useAllRows<ProvinceRow>('provinces');
  const { t } = useTranslation('resources');

  const filteredProvinces = countryFilter
    ? provinces.filter((province) => province.countryId === countryFilter)
    : provinces;

  return (
    <>
      <Form.Item label={t('location.countryFilter')}>
        <Select
          allowClear
          placeholder={t('location.countryFilterPlaceholder')}
          options={countries.map((country) => ({ label: country.name, value: country.id }))}
          onChange={setCountryFilter}
        />
      </Form.Item>
      <Form.Item label={t('fields.province')} name="provinceId" rules={[{ required: true }]}>
        <Select options={filteredProvinces.map((province) => ({ label: province.name, value: province.id }))} />
      </Form.Item>
      <Form.Item label={t('fields.name')} name="name" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
    </>
  );
};
