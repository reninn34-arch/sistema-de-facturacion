import React from 'react';
import ConfigProfileSection from '../modules/configuracion/components/ConfigProfileSection';
import ConfigFiscalSection from '../modules/configuracion/components/ConfigFiscalSection';
import ConfigEmissionPointsSection from '../modules/configuracion/components/ConfigEmissionPointsSection';
import ConfigSignatureSection from '../modules/configuracion/components/ConfigSignatureSection';
import { EmissionPoint } from '../types/types';

interface RenderConfigContentProps {
  businessInfo: any;
  personalEmail: string;
  passwordData: { current: string; new: string; confirm: string };
  showProfilePassword: boolean;
  signatureFile: File | null;
  showSignaturePassword: boolean;
  emissionPoints: EmissionPoint[];
  selectedEmissionPoint: EmissionPoint | null;
  currentPlanMaxEmissionPoints: number;
  currentUser: any;
  setBusinessInfo: (fn: (prev: any) => any) => void;
  setPersonalEmail: (v: string) => void;
  setPasswordData: (fn: (prev: any) => any) => void;
  setShowProfilePassword: (v: boolean) => void;
  setSignatureFile: (f: File | null) => void;
  setSignatureBuffer: (b: ArrayBuffer | null) => void;
  setSignaturePassword: (p: string) => void;
  setShowSignaturePassword: (v: boolean) => void;
  setEmissionPoints: React.Dispatch<React.SetStateAction<EmissionPoint[]>>;
  setSelectedEmissionPoint: React.Dispatch<React.SetStateAction<EmissionPoint | null>>;
  handleUpdateProfile: () => void;
  handleChangePassword: () => void;
  toggleDarkMode: () => void;
  showNotify: (msg: string, type?: any) => void;
  saveBusinessField: (data: any) => void;
  saveBusinessConfig: () => void;
  handleSignatureFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  logoInputRef: React.RefObject<HTMLInputElement | null>;
}

const renderConfigContent = (props: RenderConfigContentProps) => {
  const isUserAdmin = props.currentUser?.role === 'ADMIN' || props.currentUser?.role === 'SUPERADMIN';

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
      <ConfigProfileSection
        businessInfo={props.businessInfo}
        personalEmail={props.personalEmail}
        passwordData={props.passwordData}
        showProfilePassword={props.showProfilePassword}
        signatureFile={props.signatureFile}
        setBusinessInfo={props.setBusinessInfo}
        setPersonalEmail={props.setPersonalEmail}
        setPasswordData={props.setPasswordData}
        setShowProfilePassword={props.setShowProfilePassword}
        handleUpdateProfile={props.handleUpdateProfile}
        handleChangePassword={props.handleChangePassword}
        toggleDarkMode={props.toggleDarkMode}
        showNotify={props.showNotify}
        saveBusinessField={props.saveBusinessField}
        logoInputRef={props.logoInputRef}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <ConfigFiscalSection
          businessInfo={props.businessInfo}
          setBusinessInfo={props.setBusinessInfo}
          isUserAdmin={isUserAdmin}
        />

        {isUserAdmin && (
          <>
            <ConfigEmissionPointsSection
              emissionPoints={props.emissionPoints}
              selectedEmissionPoint={props.selectedEmissionPoint}
              currentPlanMaxEmissionPoints={props.currentPlanMaxEmissionPoints}
              setEmissionPoints={props.setEmissionPoints}
              setSelectedEmissionPoint={props.setSelectedEmissionPoint}
              showNotify={props.showNotify}
            />
          </>
        )}
      </div>

      {isUserAdmin && (
        <ConfigSignatureSection
          signatureFile={props.signatureFile}
          signaturePassword={props.signaturePassword}
          showSignaturePassword={props.showSignaturePassword}
          businessInfo={props.businessInfo}
          setSignatureFile={props.setSignatureFile}
          setSignatureBuffer={props.setSignatureBuffer}
          setSignaturePassword={props.setSignaturePassword}
          setShowSignaturePassword={props.setShowSignaturePassword}
          setBusinessInfo={props.setBusinessInfo}
          saveBusinessField={props.saveBusinessField}
          saveBusinessConfig={props.saveBusinessConfig}
          showNotify={props.showNotify}
          handleSignatureFileChange={props.handleSignatureFileChange}
        />
      )}
    </div>
  );
};

export default renderConfigContent;
