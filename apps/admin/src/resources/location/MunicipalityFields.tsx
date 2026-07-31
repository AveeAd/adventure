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

interface DistrictRow {
  id: string;
  name: string;
  provinceId: string;
}

const MUNICIPALITY_TYPE_VALUES = ['METROPOLITAN_CITY', 'SUB_METROPOLITAN_CITY', 'MUNICIPALITY', 'RURAL_MUNICIPALITY'];

export const MunicipalityFields = () => {
  const [countryFilter, setCountryFilter] = useState<string>();
  const [provinceFilter, setProvinceFilter] = useState<string>();
  const { t } = useTranslation('resources');

  const countries = useAllRows<CountryRow>('countries');
  const provinces = useAllRows<ProvinceRow>('provinces');
  const districts = useAllRows<DistrictRow>('districts');

  const filteredProvinces = countryFilter
    ? provinces.filter((province) => province.countryId === countryFilter)
    : provinces;

  const filteredDistricts = provinceFilter
    ? districts.filter((district) => district.provinceId === provinceFilter)
    : districts;

  const municipalityTypes = MUNICIPALITY_TYPE_VALUES.map((value) => ({
    value,
    label: t(`location.municipalityTypes.${value}`),
  }));

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
      <Form.Item label={t('location.provinceFilter')}>
        <Select
          allowClear
          placeholder={t('location.provinceFilterPlaceholder')}
          options={filteredProvinces.map((province) => ({ label: province.name, value: province.id }))}
          onChange={setProvinceFilter}
        />
      </Form.Item>
      <Form.Item label={t('fields.district')} name="districtId" rules={[{ required: true }]}>
        <Select options={filteredDistricts.map((district) => ({ label: district.name, value: district.id }))} />
      </Form.Item>
      <Form.Item label={t('fields.name')} name="name" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item label={t('fields.slug')} name="slug" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item label={t('fields.type')} name="type" rules={[{ required: true }]}>
        <Select options={municipalityTypes} />
      </Form.Item>
    </>
  );
};
