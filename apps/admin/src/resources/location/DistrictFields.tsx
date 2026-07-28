import { useState } from 'react';
import { Form, Input, Select } from 'antd';
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

  const filteredProvinces = countryFilter
    ? provinces.filter((province) => province.countryId === countryFilter)
    : provinces;

  return (
    <>
      <Form.Item label="Country (filter)">
        <Select
          allowClear
          placeholder="Narrow the province list by country"
          options={countries.map((country) => ({ label: country.name, value: country.id }))}
          onChange={setCountryFilter}
        />
      </Form.Item>
      <Form.Item label="Province" name="provinceId" rules={[{ required: true }]}>
        <Select options={filteredProvinces.map((province) => ({ label: province.name, value: province.id }))} />
      </Form.Item>
      <Form.Item label="Name" name="name" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item label="Slug" name="slug" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
    </>
  );
};
