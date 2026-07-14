import React, { useState, useEffect } from 'react';
import ConfigProfileSection from '../modules/configuracion/components/ConfigProfileSection';
import ConfigFiscalSection from '../modules/configuracion/components/ConfigFiscalSection';
import ConfigEmissionPointsSection from '../modules/configuracion/components/ConfigEmissionPointsSection';
import ConfigSignatureSection from '../modules/configuracion/components/ConfigSignatureSection';
import { useAppContext } from '../context/AppContext';

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

/**
 * Sección de configuración. El estado de UI (contraseñas, email personal,
 * visibilidad de campos) vive aquí — no en el contexto global — para que
 * teclear en estos formularios no re-renderice toda la aplicación.
 */
const ConfigContent: React.FC = () => {
  const {
    businessInfo, setBusinessInfo,
    signatureFile, signaturePassword,
    setSignatureFile, setSignatureBuffer, setSignaturePassword,
    emissionPoints, setEmissionPoints,
    selectedEmissionPoint, setSelectedEmissionPoint,
    currentPlanMaxEmissionPoints,
    currentUser, setCurrentUser,
    toggleDarkMode, showNotify,
    saveBusinessField, saveBusinessConfig,
    handleSignatureFileChange,
    logoInputRef,
  } = useAppContext();

  const [personalEmail, setPersonalEmail] = useState<string>(currentUser?.email || '');
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
  const [showProfilePassword, setShowProfilePassword] = useState(false);
  const [showSignaturePassword, setShowSignaturePassword] = useState(false);

  useEffect(() => {
    if (currentUser?.email) setPersonalEmail(currentUser.email);
  }, [currentUser?.email]);

  const handleUpdateProfile = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/api/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email: personalEmail })
      });
      const data = await response.json();
      if (data.success) {
        showNotify('Correo personal actualizado correctamente');
        const newUser = { ...currentUser, email: data.user.email };
        localStorage.setItem('adminUser', JSON.stringify(newUser));
        setCurrentUser(newUser);
      } else {
        showNotify(data.message, 'error');
      }
    } catch (error) {
      showNotify('Error al actualizar perfil', 'error');
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.new !== passwordData.confirm) {
      showNotify('Las contraseñas nuevas no coinciden', 'error');
      return;
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(passwordData.new)) {
      showNotify('La contraseña debe tener al menos 8 caracteres, una mayúscula y un número.', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/api/user/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordData.current,
          newPassword: passwordData.new
        })
      });
      const data = await response.json();
      if (data.success) {
        showNotify('Contraseña actualizada correctamente');
        setPasswordData({ current: '', new: '', confirm: '' });
        const updatedUser = { ...currentUser, requirePasswordChange: false };
        setCurrentUser(updatedUser);
        localStorage.setItem('adminUser', JSON.stringify(updatedUser));
      } else {
        showNotify(data.message, 'error');
      }
    } catch (error) {
      showNotify('Error al cambiar contraseña', 'error');
    }
  };

  const isUserAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPERADMIN';

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
      <ConfigProfileSection
        businessInfo={businessInfo}
        personalEmail={personalEmail}
        passwordData={passwordData}
        showProfilePassword={showProfilePassword}
        signatureFile={signatureFile}
        setBusinessInfo={setBusinessInfo}
        setPersonalEmail={setPersonalEmail}
        setPasswordData={setPasswordData}
        setShowProfilePassword={setShowProfilePassword}
        handleUpdateProfile={handleUpdateProfile}
        handleChangePassword={handleChangePassword}
        toggleDarkMode={toggleDarkMode}
        showNotify={showNotify}
        saveBusinessField={saveBusinessField}
        logoInputRef={logoInputRef}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <ConfigFiscalSection
          businessInfo={businessInfo}
          setBusinessInfo={setBusinessInfo}
          isUserAdmin={isUserAdmin}
        />

        {isUserAdmin && (
          <>
            <ConfigEmissionPointsSection
              emissionPoints={emissionPoints}
              selectedEmissionPoint={selectedEmissionPoint}
              currentPlanMaxEmissionPoints={currentPlanMaxEmissionPoints}
              setEmissionPoints={setEmissionPoints}
              setSelectedEmissionPoint={setSelectedEmissionPoint}
              showNotify={showNotify}
            />
          </>
        )}
      </div>

      {isUserAdmin && (
        <ConfigSignatureSection
          signatureFile={signatureFile}
          signaturePassword={signaturePassword}
          showSignaturePassword={showSignaturePassword}
          businessInfo={businessInfo}
          setSignatureFile={setSignatureFile}
          setSignatureBuffer={setSignatureBuffer}
          setSignaturePassword={setSignaturePassword}
          setShowSignaturePassword={setShowSignaturePassword}
          setBusinessInfo={setBusinessInfo}
          saveBusinessField={saveBusinessField}
          saveBusinessConfig={saveBusinessConfig}
          showNotify={showNotify}
          handleSignatureFileChange={handleSignatureFileChange}
        />
      )}
    </div>
  );
};

export default ConfigContent;
