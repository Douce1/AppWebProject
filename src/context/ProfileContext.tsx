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

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [education, setEducation] = useState<CareerEducation | null>(null);
  const [careers, setCareers] = useState<CareerItem[]>([]);
  const [certifications, setCertifications] = useState<CertificationItem[]>([]);

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
