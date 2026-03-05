import React, { createContext, useState, useContext } from 'react';

export interface CareerEducation {
  schoolName: string;
  major: string;
  graduationYear: string;
}

export interface CareerItem {
  id: string;
  description: string;
}

export interface CertificationItem {
  id: string;
  name: string;
  year: string;
}

interface ProfileContextType {
  selectedRegions: string[];
  setSelectedRegions: (regions: string[]) => void;
  education: CareerEducation | null;
  setEducation: (e: CareerEducation | null) => void;
  careers: CareerItem[];
  setCareers: (c: CareerItem[]) => void;
  certifications: CertificationItem[];
  setCertifications: (c: CertificationItem[]) => void;
}

const defaultContext: ProfileContextType = {
  selectedRegions: [],
  setSelectedRegions: () => {},
  education: null,
  setEducation: () => {},
  careers: [],
  setCareers: () => {},
  certifications: [],
  setCertifications: () => {},
};

const ProfileContext = createContext<ProfileContextType>(defaultContext);

/** 나의 경력 샘플 데이터 (초기 표시용) */
const SAMPLE_EDUCATION: CareerEducation = {
  schoolName: '서울대학교',
  major: '수학교육과',
  graduationYear: '2010',
};

const SAMPLE_CAREERS: CareerItem[] = [
  { id: 'c1', description: '메가스터디 수학 강의 (2015~현재)' },
  { id: 'c2', description: 'OO고등학교 방과후 강사 (2012~2014)' },
];

const SAMPLE_CERTIFICATIONS: CertificationItem[] = [
  { id: 'cert1', name: '중등교원자격증(수학)', year: '2010' },
  { id: 'cert2', name: 'TOEIC 900', year: '2012' },
];

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [education, setEducation] = useState<CareerEducation | null>(SAMPLE_EDUCATION);
  const [careers, setCareers] = useState<CareerItem[]>(SAMPLE_CAREERS);
  const [certifications, setCertifications] = useState<CertificationItem[]>(SAMPLE_CERTIFICATIONS);

  return (
    <ProfileContext.Provider
      value={{
        selectedRegions,
        setSelectedRegions,
        education,
        setEducation,
        careers,
        setCareers,
        certifications,
        setCertifications,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => useContext(ProfileContext);
