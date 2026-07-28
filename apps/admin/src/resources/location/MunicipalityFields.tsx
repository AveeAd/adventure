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

interface DistrictRow {
  id: string;
  name: string;
  provinceId: string;
}

const MUNICIPALITY_TYPES = [
  { label: 'Metropolitan City', value: 'METROPOLITAN_CITY' },
  { label: 'Sub-Metropolitan City', value: 'SUB_METROPOLITAN_CITY' },
  { label: 'Municipality', value: 'MUNICIPALITY' },
  { label: 'Rural Municipality', value: 'RURAL_MUNICIPALITY' },
];

export const MunicipalityFields = () => {
  const [countryFilter, setCountryFilter] = useState<string>();
  const [provinceFilter, setProvinceFilter] = useState<string>();

  const countries = useAllRows<CountryRow>('countries');
  const provinces = useAllRows<ProvinceRow>('provinces');
  const districts = useAllRows<DistrictRow>('districts');

  const filteredProvinces = countryFilter
    ? provinces.filter((province) => province.countryId === countryFilter)
    : provinces;

  const filteredDistricts = provinceFilter
    ? districts.filter((district) => district.provinceId === provinceFilter)
    : districts;

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
      <Form.Item label="Province (filter)">
        <Select
          allowClear
          placeholder="Narrow the district list by province"
          options={filteredProvinces.map((province) => ({ label: province.name, value: province.id }))}
          onChange={setProvinceFilter}
        />
      </Form.Item>
      <Form.Item label="District" name="districtId" rules={[{ required: true }]}>
        <Select options={filteredDistricts.map((district) => ({ label: district.name, value: district.id }))} />
      </Form.Item>
      <Form.Item label="Name" name="name" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item label="Slug" name="slug" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item label="Type" name="type" rules={[{ required: true }]}>
        <Select options={MUNICIPALITY_TYPES} />
      </Form.Item>
    </>
  );
};
