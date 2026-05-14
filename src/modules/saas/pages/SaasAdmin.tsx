import React, { useState, useEffect, useMemo } from 'react';
import { ShieldCheckIcon, BuildingOffice2Icon, UserPlusIcon, CheckCircleIcon, CheckBadgeIcon, UsersIcon, MagnifyingGlassIcon, EyeIcon, XMarkIcon, Cog6ToothIcon, ArrowPathIcon, PauseIcon, PlayIcon, TrashIcon, UserIcon, PencilIcon, PlusIcon, EyeSlashIcon, UserMinusIcon } from '@heroicons/react/24/outline';
import { BUSINESS_TYPES, BusinessType } from '../../../types/types';

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

interface Business {
  id: string;
  name: string;
  ruc: string;
  email: string;
  subscriptionEnd: string | null;
  isActive: boolean;
  plan: string;
}

interface User {
  id: string;
  email: string;
  role: string;
  name?: string;
  isActive: boolean;
  businessId: string | null;
  business: Business | null;
}

// Interface para suscripciones del SaaS (planes)
interface SaasSubscription {
  id: string;
  code: string;
  name: string;
  description: string;
  price: number;
  period: 'mensual' | 'bimestral' | 'trimestral' | 'semestral' | 'anual';
  durationDays: number;
  features: string[];
  isActive: boolean;
}

interface SaasAdminProps {
  onNotify: (text: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

const SaasAdmin: React.FC<SaasAdminProps> = ({ onNotify }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [businessUsers, setBusinessUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [expiringBusinesses, setExpiringBusinesses] = useState<any[]>([]);
  const [loadingExpiring, setLoadingExpiring] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'businesses' | 'superadmins' | 'users' | 'subscription-payments' | 'config' | 'expiring'>('businesses');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Estados para historial de pagos de suscripciones
  const [subscriptionPayments, setSubscriptionPayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [showDeletePaymentModal, setShowDeletePaymentModal] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<any>(null);

  // Estados para suscripciones del SaaS
  const [saasSubscriptions, setSaasSubscriptions] = useState<SaasSubscription[]>([]);

  // Helper: obtener info de umbrales dinámicos según el plan
  const getPlanThreshold = (planCode: string | undefined) => {
    const plan = saasSubscriptions.find(p => p.code === planCode);
    const durationDays = plan?.durationDays || 30;
    const redThreshold = Math.max(Math.ceil(durationDays * 0.20), 3);
    const amberThreshold = Math.max(Math.ceil(durationDays * 0.50), 7);
    return { durationDays, redThreshold, amberThreshold };
  };

  // Conteo de empresas realmente en zona de riesgo (filtrado por umbrales dinámicos)
  const expiringRiskCount = useMemo(() => {
    return expiringBusinesses.filter((b: any) => {
      if (b.plan === 'UNLIMITED') return false;
      const daysLeft = Math.ceil((new Date(b.subscriptionEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysLeft < 0) return true;
      const { amberThreshold: at } = getPlanThreshold(b.plan);
      return daysLeft <= at;
    }).length;
  }, [expiringBusinesses, saasSubscriptions]);

  const [loadingPlans, setLoadingPlans] = useState(true);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<SaasSubscription | null>(null);
  const [subscriptionForm, setSubscriptionForm] = useState({
    code: '',
    name: '',
    description: '',
    price: 0,
    period: 'mensual' as const,
    durationDays: 30,
    features: '',
    isActive: true
  });

  // Estados para modales
  const [showUserModal, setShowUserModal] = useState(false);
  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showUserDeleteModal, setShowUserDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [showResetUserModal, setShowResetUserModal] = useState(false);
  const [showResetAdminModal, setShowResetAdminModal] = useState(false);
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [selectedUserToReset, setSelectedUserToReset] = useState<User | null>(null);
  const [selectedAdminUser, setSelectedAdminUser] = useState<User | null>(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [selectedUserToEdit, setSelectedUserToEdit] = useState<User | null>(null);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showEditBusinessModal, setShowEditBusinessModal] = useState(false);
  const [editBusinessForm, setEditBusinessForm] = useState({
    name: '',
    ruc: '',
    email: '',
    phone: '',
    address: '',
    plan: 'FREE',
    businessType: 'GENERAL' as string
  });
  const [tempPassword, setTempPassword] = useState('');
  const [newUserFormData, setNewUserFormData] = useState({
    email: '',
    password: '',
    role: 'ADMIN'
  });

  const [userFormData, setUserFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [businessFormData, setBusinessFormData] = useState({
    name: '',
    ruc: '',
    email: '',
    address: '',
    phone: '',
    plan: 'PENDING',
    password: '',
    businessType: 'GENERAL' as string
  });

  // Estado para configuración de pagos
  const [paymentConfig, setPaymentConfig] = useState({
    bankAccounts: [] as Array<{
      id: string;
      bankName: string;
      bankAccount: string;
      bankAccountType: string;
      bankHolderName: string;
      bankHolderRuc: string;
    }>,
    paypalEnabled: true,
    transferEnabled: true,
    cardEnabled: false
  });
  const [savingConfig, setSavingConfig] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);

  const loadPaymentConfig = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/api/admin/settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (data) {
          setPaymentConfig({
            bankAccounts: data.bankAccounts || [],
            paypalEnabled: data.paypalEnabled !== false,
            transferEnabled: data.transferEnabled !== false,
            cardEnabled: data.cardEnabled || false
          });
        }
      }
    } catch (error) {
      console.error('Error cargando config:', error);
    } finally {
      setLoadingConfig(false);
    }
  };

  const savePaymentConfig = async () => {
    setSavingConfig(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/api/admin/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(paymentConfig)
      });
      if (response.ok) {
        onNotify('Configuración de pagos guardada correctamente', 'success');
      } else {
        onNotify('Error al guardar configuración', 'error');
      }
    } catch (error) {
      onNotify('Error de conexión', 'error');
    } finally {
      setSavingConfig(false);
    }
  };

  // Cargar configuración al entrar a la pestaña config
  useEffect(() => {
    if (activeTab === 'config') {
      loadPaymentConfig();
    }
  }, [activeTab]);

  // Cargar usuarios de la empresa seleccionada
  const loadBusinessUsers = async (businessId: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/api/admin/businesses/${businessId}/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Error al cargar usuarios');
      const data = await response.json();
      setBusinessUsers(data);
    } catch (error) {
      console.error(error);
      onNotify('Error al cargar usuarios de la empresa', 'error');
    }
  };

  // Crear usuario para la empresa
  const handleCreateBusinessUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusiness || !newUserFormData.email || !newUserFormData.password) {
      onNotify('Email y contraseña son obligatorios', 'warning');
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/api/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...newUserFormData,
          businessId: selectedBusiness.id,
          role: newUserFormData.role || 'ADMIN'
        })
      });

      const data = await response.json();
      if (response.ok) {
        onNotify('Usuario creado exitosamente', 'success');
        setShowNewUserModal(false);
        setNewUserFormData({ email: '', password: '', role: 'ADMIN' });
        loadBusinessUsers(selectedBusiness.id);
      } else {
        onNotify(data.message || 'Error al crear usuario', 'error');
      }
    } catch (error) {
      onNotify('Error de conexión', 'error');
    }
  };

  // Eliminar usuario
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/api/admin/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        onNotify('Usuario eliminado', 'success');
        // Recargar datos para actualizar todas las pestañas
        loadData();
      } else {
        const data = await response.json();
        onNotify(data.message || 'Error al eliminar usuario', 'error');
      }
    } catch (error) {
      onNotify('Error de conexión', 'error');
    } finally {
      setShowUserDeleteModal(false);
      setUserToDelete(null);
    }
  };

  // Toggle estado de usuario
  const handleToggleUserStatus = async (user: User) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/api/admin/users/${user.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: !user.isActive })
      });

      const data = await response.json();
      if (response.ok) {
        onNotify(`Usuario ${!user.isActive ? 'activado' : 'desactivado'}`, 'success');
        // Actualizar selectedUser si es el mismo que se cambió
        if (selectedUser && selectedUser.id === user.id) {
          setSelectedUser({ ...selectedUser, isActive: !user.isActive });
        }
        // Recargar datos para actualizar todas las pestañas
        loadData();
      } else {
        onNotify(data.message || 'Error al cambiar estado', 'error');
      }
    } catch (error) {
      onNotify('Error de conexión', 'error');
    }
  };

  // Resetear contraseña de usuario
  const handleResetUserPassword = async () => {
    if (!selectedUserToReset || !tempPassword) return;
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/api/admin/users/${selectedUserToReset.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ temporaryPassword: tempPassword })
      });
      const data = await response.json();
      if (data.success) {
        onNotify(data.message, 'success');
        setShowResetUserModal(false);
        setTempPassword('');
        // Actualizar selectedUser si es el mismo que se cambió
        if (selectedUser && selectedUserToReset && selectedUser.id === selectedUserToReset.id) {
          setSelectedUser({ ...selectedUser });
        }
      } else {
        onNotify(data.message || 'Error al resetear contraseña', 'error');
      }
    } catch (error) {
      onNotify('Error de conexión', 'error');
    }
  };

  // Editar usuario
  const [editUserForm, setEditUserForm] = useState({ name: '', role: 'ADMIN' });
   
  const handleEditUser = () => {
    if (selectedUserToEdit) {
      setEditUserForm({
        name: selectedUserToEdit.name || '',
        role: selectedUserToEdit.role
      });
    }
  };

  const confirmEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserToEdit) return;
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/api/admin/users/${selectedUserToEdit.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editUserForm)
      });
      const data = await response.json();
      if (response.ok) {
        onNotify('Usuario actualizado exitosamente', 'success');
        setShowEditUserModal(false);
        setSelectedUserToEdit(null);
        // Actualizar selectedUser con la respuesta del servidor
        if (selectedUser && selectedUserToEdit && selectedUser.id === selectedUserToEdit.id && data.user) {
          setSelectedUser(data.user);
        }
        // Recargar datos para actualizar todas las pestañas
        loadData();
      } else {
        onNotify(data.message || 'Error al actualizar usuario', 'error');
      }
    } catch (error) {
      onNotify('Error de conexión', 'error');
    }
  };

  // Effect para cargar usuarios cuando se selecciona una empresa
  useEffect(() => {
    if (selectedBusiness) {
      loadBusinessUsers(selectedBusiness.id);
    }
  }, [selectedBusiness]);

  // Limpiar selección cuando se cambia de pestaña
  useEffect(() => {
    setSelectedUser(null);
    setSelectedBusiness(null);
  }, [activeTab]);

  // Cargar datos de pagos de suscripciones cuando se cambia a esa pestaña
  useEffect(() => {
    if (activeTab === 'subscription-payments') {
      loadSubscriptionPayments();
    }
  }, [activeTab]);

  // Función para cargar pagos de suscripciones
  const loadSubscriptionPayments = async () => {
    setLoadingPayments(true);
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) return;

      const response = await fetch(`${API_URL}/api/admin/subscriptions?limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSubscriptionPayments(data.subscriptions || []);
      }
    } catch (error) {
      console.error('Error cargando pagos:', error);
    } finally {
      setLoadingPayments(false);
    }
  };

  // Función para eliminar un pago de suscripción
  const handleDeletePayment = async () => {
    if (!paymentToDelete) return;
    
    setProcessing(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/api/admin/subscriptions/${paymentToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        onNotify('Pago eliminado correctamente', 'success');
        setSubscriptionPayments(subscriptionPayments.filter(p => p.id !== paymentToDelete.id));
      } else {
        onNotify('Error al eliminar el pago', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      onNotify('Error al eliminar el pago', 'error');
    } finally {
      setProcessing(false);
      setShowDeletePaymentModal(false);
      setPaymentToDelete(null);
    }
  };

  // Cargar datos iniciales
  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) { console.error('No hay token'); onNotify('No hay sesion activa', 'error'); return; }

      const response = await fetch(`${API_URL}/api/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) { const err = await response.json().catch(() => ({})); console.error('Error response:', response.status, err); throw new Error(err.message || 'Error al cargar datos'); }
       
      const data: User[] = await response.json();
      setUsers(data);

      // Extraer empresas únicas de los usuarios
      const uniqueBusinesses = data
        .map(u => u.business)
        .filter((b): b is Business => !!b)
        .filter((b, index, self) => index === self.findIndex(t => t.id === b.id));
       
      setBusinesses(uniqueBusinesses);

      // Si hay una empresa seleccionada, actualizar sus datos
      if (selectedBusiness) {
        const updated = uniqueBusinesses.find(b => b.id === selectedBusiness.id);
        if (updated) setSelectedBusiness(updated);
      }

    } catch (error) {
      console.error('Error en loadData:', error);
      onNotify('Error al cargar el panel SaaS: ' + (error as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Cargar empresas por vencer
  const loadExpiringBusinesses = async () => {
    setLoadingExpiring(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/api/admin/subscriptions/expiring?days=30`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setExpiringBusinesses(data);
      }
    } catch (error) {
      console.error('Error cargando empresas por vencer:', error);
    } finally {
      setLoadingExpiring(false);
    }
  };

  useEffect(() => {
    loadData();
    loadPlans();
    loadExpiringBusinesses();

    // Leer tab inicial desde sessionStorage (para enlaces desde Dashboard)
    const initialTab = sessionStorage.getItem('saasAdminTab');
    if (initialTab === 'expiring') {
      setActiveTab('expiring');
      sessionStorage.removeItem('saasAdminTab');
    }
    
    // Escuchar actualizaciones de planes desde otras páginas
    const handlePlansUpdate = () => {
      loadPlans();
    };
    
    // Verificar si hubo actualizaciones mientras la página estaba oculta
    const checkForUpdates = () => {
      const lastUpdate = localStorage.getItem('plans_updated');
      if (lastUpdate) {
        const updateTime = parseInt(lastUpdate);
        const pageLoadTime = parseInt(sessionStorage.getItem('page_load_time_saasadmin') || '0');
        if (updateTime > pageLoadTime) {
          loadPlans();
        }
      }
    };
    
    // Guardar tiempo de carga de la página
    sessionStorage.setItem('page_load_time_saasadmin', Date.now().toString());
    
    // Verificar inmediatamente si hay actualizaciones
    checkForUpdates();
    
    // Listener para storage (detecta cambios en localStorage de otras pestañas)
    window.addEventListener('storage', handlePlansUpdate);
    
    return () => {
      window.removeEventListener('storage', handlePlansUpdate);
    };
  }, []);

  // Cargar planes de suscripción desde la API
  const loadPlans = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/api/subscription-plans`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (response.ok) {
        const data = await response.json();
        if (data.plans && data.plans.length > 0) {
          setSaasSubscriptions(data.plans);
        }
      }
    } catch (error) {
      console.error('Error cargando planes:', error);
    } finally {
      setLoadingPlans(false);
    }
  };

  // Filtrar empresas
  const filteredBusinesses = businesses.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    b.ruc.includes(searchTerm)
  );

  // Toggle status business
  const toggleBusinessStatus = async (businessId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/api/admin/businesses/${businessId}/toggle-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: newStatus })
      });

      const result = await response.json();
      if (result.success) {
        onNotify(`✅ ${result.message}`, 'success');
        loadData();
      } else {
        onNotify(result.message || 'Error al cambiar estado', 'error');
      }
    } catch (error) {
      onNotify('Error de conexión', 'error');
    }
  };

  const handleResetAdminPassword = async () => {
    if (!selectedBusiness) return;
    const adminUser = users.find(u => u.business?.id === selectedBusiness.id);
    if (!adminUser) return onNotify('No se encontró usuario admin', 'error');
    setSelectedAdminUser(adminUser);
    setAdminPassword('');
    setShowResetAdminModal(true);
  };

  const confirmResetAdminPassword = async () => {
    if (!selectedAdminUser || !adminPassword) return;
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/api/admin/users/${selectedAdminUser.id}/reset-password`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ temporaryPassword: adminPassword })
      });
      const data = await response.json();
      if (data.success) {
        onNotify(data.message, 'success');
        setShowResetAdminModal(false);
        setAdminPassword('');
        setSelectedAdminUser(null);
      }
    } catch (error) { onNotify('Error de conexión', 'error'); }
  };

  const handleUpdateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusiness) return;
    try {
      const token = localStorage.getItem('adminToken');
      // Excluir el campo 'plan' del payload ya que es de solo lectura
      // El plan se actualiza automáticamente según las facturas emitidas
      const { plan, ...updateData } = editBusinessForm;
      const response = await fetch(`${API_URL}/api/admin/businesses/${selectedBusiness.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });
      const data = await response.json();
      if (response.ok) {
        onNotify('Empresa actualizada exitosamente', 'success');
        setShowEditBusinessModal(false);
        loadData();
        // Actualizar selectedBusiness sin modificar el plan
        const { plan, ...formData } = editBusinessForm;
        const updated = { ...selectedBusiness, ...formData };
        setSelectedBusiness(updated);
      } else {
        onNotify(data.message || 'Error al actualizar empresa', 'error');
      }
    } catch (error) { onNotify('Error de conexión', 'error'); }
  };

  const handleDeleteBusiness = async () => {
    if (!selectedBusiness) return;
    
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/api/admin/businesses/${selectedBusiness.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        onNotify('Empresa eliminada correctamente', 'success');
        setSelectedBusiness(null);
        setShowDeleteModal(false);
        loadData();
      } else {
        const data = await response.json();
        onNotify(data.message || 'Error al eliminar', 'error');
      }
    } catch (error) {
      onNotify('Error de conexión', 'error');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userFormData.password !== userFormData.confirmPassword) {
      onNotify("Las contraseñas no coinciden", "error");
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/api/admin/users`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ...userFormData, role: 'SUPERADMIN' })
      });

      const data = await response.json();

      if (response.ok) {
        onNotify('Superadmin creado exitosamente', 'success');
        setShowUserModal(false);
        setUserFormData({ email: '', password: '', confirmPassword: '' });
        loadData();
      } else {
        onNotify('Error: ' + (data.message || data.error || 'Ocurrió un error desconocido'), 'error');
      }
    } catch (error) {
      console.error(error);
      onNotify('Error de conexión', 'error');
    }
  };

  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/api/admin/businesses`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(businessFormData)
      });

      if (response.ok) {
        onNotify('Empresa registrada exitosamente', 'success');
        setShowBusinessModal(false);
        setBusinessFormData({ name: '', ruc: '', email: '', address: '', phone: '', plan: 'PENDING', password: '', businessType: 'GENERAL' });
        loadData();
      } else {
        const err = await response.json();
        onNotify('Error: ' + err.message, 'error');
      }
    } catch (error) {
      console.error(error);
      onNotify('Error de conexión', 'error');
    }
  };

  return (
    <>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          .font-display { font-family: 'Inter', sans-serif; }
        `}
      </style>
      
      <div className="bg-[#F6F6F7] dark:bg-[#0F172A] font-display text-[#0d121b] dark:text-slate-200 min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-50 w-full bg-white dark:bg-slate-900 border-b border-solid border-[#e7ebf3] dark:border-slate-800 px-4 py-3">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between whitespace-nowrap mb-3">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-indigo-700">
                  <div className="size-8 flex items-center justify-center bg-indigo-700 rounded-lg text-white">
                    <ShieldCheckIcon className="w-5 h-5" />
                  </div>
                  <h2 className="text-[#0d121b] dark:text-white text-base md:text-lg font-bold leading-tight">Panel SaaS</h2>
                </div>
                {/* Tabs */}
                <div className="hidden md:flex gap-1">
                  <button 
                    className={`px-3 py-1 text-sm font-medium transition-colors rounded-lg ${activeTab === 'businesses' ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300' : 'text-[#4c669a] dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    onClick={() => setActiveTab('businesses')}
                  >
                    Empresas
                  </button>
                  <button 
                    className={`px-3 py-1 text-sm font-medium transition-colors rounded-lg ${activeTab === 'superadmins' ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300' : 'text-[#4c669a] dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    onClick={() => setActiveTab('superadmins')}
                  >
                    Superadmins
                  </button>
                  <button 
                    className={`px-3 py-1 text-sm font-medium transition-colors rounded-lg ${activeTab === 'users' ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300' : 'text-[#4c669a] dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    onClick={() => setActiveTab('users')}
                  >
                    Usuarios
                  </button>
                  <button 
                    className={`px-3 py-1 text-sm font-medium transition-colors rounded-lg ${activeTab === 'subscription-payments' ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300' : 'text-[#4c669a] dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    onClick={() => setActiveTab('subscription-payments')}
                  >
                    Pagos
                  </button>
                  <button 
                    className={`px-3 py-1 text-sm font-medium transition-colors rounded-lg inline-flex items-center gap-1.5 ${activeTab === 'expiring' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400' : 'text-[#4c669a] dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    onClick={() => setActiveTab('expiring')}
                  >
                    Por Vencer
                    {expiringRiskCount > 0 && (
                      <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                        {expiringRiskCount}
                      </span>
                    )}
                  </button>
                  <button 
                    className={`px-3 py-1 text-sm font-medium transition-colors rounded-lg ${activeTab === 'config' ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300' : 'text-[#4c669a] dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    onClick={() => setActiveTab('config')}
                  >
                    Métodos de Pago
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowBusinessModal(true)}
                  className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 bg-[#135bec] text-white text-xs md:text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
                >
                  <BuildingOffice2Icon className="w-[18px] h-[18px] md:w-5 md:h-5" />
                  <span className="hidden sm:inline">Nueva Empresa</span>
                </button>
                <button 
                  onClick={() => setShowUserModal(true)}
                  className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 bg-slate-100 dark:bg-slate-800 text-[#0d121b] dark:text-white text-xs md:text-sm font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <UserPlusIcon className="w-[18px] h-[18px] md:w-5 md:h-5" />
                  <span className="hidden sm:inline">Nuevo Admin</span>
                </button>
              </div>
            </div>
            {/* Mobile Tabs */}
            <div className="flex md:hidden gap-2 overflow-x-auto -mx-4 px-4 pb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <button 
                className={`flex-shrink-0 px-3 py-1 text-sm font-medium transition-colors rounded-lg whitespace-nowrap ${activeTab === 'businesses' ? 'bg-[#135bec]/10 text-[#135bec]' : 'text-[#4c669a] dark:text-slate-400'}`}
                onClick={() => setActiveTab('businesses')}
              >
                Empresas
              </button>
              <button 
                className={`flex-shrink-0 px-3 py-1 text-sm font-medium transition-colors rounded-lg whitespace-nowrap ${activeTab === 'superadmins' ? 'bg-[#135bec]/10 text-[#135bec]' : 'text-[#4c669a] dark:text-slate-400'}`}
                onClick={() => setActiveTab('superadmins')}
              >
                Superadmins
              </button>
              <button 
                className={`flex-shrink-0 px-3 py-1 text-sm font-medium transition-colors rounded-lg whitespace-nowrap ${activeTab === 'users' ? 'bg-[#135bec]/10 text-[#135bec]' : 'text-[#4c669a] dark:text-slate-400'}`}
                onClick={() => setActiveTab('users')}
              >
                Usuarios
              </button>
              <button 
                className={`flex-shrink-0 px-3 py-1 text-sm font-medium transition-colors rounded-lg whitespace-nowrap ${activeTab === 'subscription-payments' ? 'bg-[#135bec]/10 text-[#135bec]' : 'text-[#4c669a] dark:text-slate-400'}`}
                onClick={() => setActiveTab('subscription-payments')}
              >
                Pagos
              </button>
              <button 
                className={`flex-shrink-0 px-3 py-1 text-sm font-medium transition-colors rounded-lg whitespace-nowrap inline-flex items-center gap-1 ${activeTab === 'expiring' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400' : 'text-[#4c669a] dark:text-slate-400'}`}
                onClick={() => setActiveTab('expiring')}
              >
                Por Vencer
                {expiringRiskCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                    {expiringRiskCount}
                  </span>
                )}
              </button>
              <button 
                className={`flex-shrink-0 px-3 py-1 text-sm font-medium transition-colors rounded-lg whitespace-nowrap ${activeTab === 'config' ? 'bg-[#135bec]/10 text-[#135bec]' : 'text-[#4c669a] dark:text-slate-400'}`}
                onClick={() => setActiveTab('config')}
              >
                Métodos de Pago
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 py-6">
          {/* Stats Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div className="flex flex-col gap-2 rounded-xl p-4 md:p-6 bg-white dark:bg-slate-900 border border-[#cfd7e7] dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-[#4c669a] dark:text-slate-400 text-xs md:text-sm font-medium">Total Empresas</p>
                <BuildingOffice2Icon className="w-[18px] h-[18px] md:w-5 md:h-5 text-[#135bec] bg-[#135bec]/10 p-1.5 md:p-2 rounded-lg" />
              </div>
              <p className="text-[#0d121b] dark:text-white text-2xl md:text-3xl font-bold">{businesses.length}</p>
              <p className="text-[#07883b] text-xs md:text-sm font-medium flex items-center gap-1">
                <CheckCircleIcon className="w-3.5 h-3.5 md:w-[18px] md:h-[18px]" /> Registradas
              </p>
            </div>
            <div className="flex flex-col gap-2 rounded-xl p-4 md:p-6 bg-white dark:bg-slate-900 border border-[#cfd7e7] dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-[#4c669a] dark:text-slate-400 text-xs md:text-sm font-medium">Empresas Activas</p>
                <CheckBadgeIcon className="w-[18px] h-[18px] md:w-5 md:h-5 text-[#07883b] bg-[#07883b]/10 p-1.5 md:p-2 rounded-lg" />
              </div>
              <p className="text-[#0d121b] dark:text-white text-2xl md:text-3xl font-bold">
                {businesses.filter(b => b.isActive).length}
              </p>
              <p className="text-[#4c669a] text-xs md:text-sm font-medium">
                Operativas
              </p>
            </div>
            <div className="flex flex-col gap-2 rounded-xl p-4 md:p-6 bg-white dark:bg-slate-900 border border-[#cfd7e7] dark:border-slate-800 shadow-sm sm:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between">
                <p className="text-[#4c669a] dark:text-slate-400 text-xs md:text-sm font-medium">Usuarios Totales</p>
                <UsersIcon className="w-[18px] h-[18px] md:w-5 md:h-5 text-[#135bec] bg-[#135bec]/10 p-1.5 md:p-2 rounded-lg" />
              </div>
              <p className="text-[#0d121b] dark:text-white text-2xl md:text-3xl font-bold">{users.length}</p>
              <p className="text-[#4c669a] dark:text-slate-400 text-xs md:text-sm font-medium">Registrados</p>
            </div>
          </div>

          {/* Businesses Section */}
          {activeTab === 'businesses' && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <h2 className="text-[#0d121b] dark:text-white text-lg md:text-xl font-bold">Empresas</h2>
                <div className="relative w-full sm:w-auto">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4c669a] dark:text-slate-400 w-[18px] h-[18px]" />
                  <input 
                    type="text" 
                    placeholder="Buscar..." 
                    className="w-full sm:w-64 pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-[#cfd7e7] dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:border-[#135bec]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-[#cfd7e7] dark:border-slate-800 overflow-hidden shadow-sm">
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#f8f9fc] dark:bg-slate-800/50">
                        <th className="px-4 py-3 text-[#0d121b] dark:text-white text-xs font-bold uppercase">Empresa</th>
                        <th className="px-4 py-3 text-[#0d121b] dark:text-white text-xs font-bold uppercase">RUC</th>
                        <th className="px-4 py-3 text-[#0d121b] dark:text-white text-xs font-bold uppercase">Plan</th>
                        <th className="px-4 py-3 text-[#0d121b] dark:text-white text-xs font-bold uppercase">Vencimiento</th>
                        <th className="px-4 py-3 text-[#0d121b] dark:text-white text-xs font-bold uppercase">Estado</th>
                        <th className="px-4 py-3 text-[#0d121b] dark:text-white text-xs font-bold uppercase text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#cfd7e7] dark:divide-slate-800">
                      {loading ? (
                        <tr><td colSpan={6} className="p-8 text-center text-slate-400">Cargando...</td></tr>
                      ) : filteredBusinesses.length === 0 ? (
                        <tr><td colSpan={6} className="p-8 text-center text-slate-400">No se encontraron empresas</td></tr>
                      ) : (
                        filteredBusinesses.map(b => (
                          <tr 
                            key={b.id} 
                            className="hover:bg-[#135bec]/5 transition-colors"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-lg bg-[#135bec]/10 flex items-center justify-center text-[#135bec]">
                                  <BuildingOffice2Icon className="w-[18px] h-[18px]" />
                                </div>
                                <div>
                                  <p className="font-bold text-[#0d121b] dark:text-white text-sm">{b.name}</p>
                                  <p className="text-xs text-[#4c669a] dark:text-slate-400">{b.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-[#4c669a] dark:text-slate-400 text-sm">{b.ruc}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                                {b.plan || 'Básico'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-[#4c669a] dark:text-slate-400 text-sm">
                              {b.subscriptionEnd ? new Date(b.subscriptionEnd).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${b.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                {b.isActive ? 'Activo' : 'Inactivo'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button 
                                onClick={() => setSelectedBusiness(b)}
                                className="p-1.5 rounded-lg bg-[#135bec]/10 text-[#135bec] hover:bg-[#135bec] hover:text-white transition-all" 
                                title="Ver detalles"
                              >
                                <EyeIcon className="w-[18px] h-[18px]" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-[#cfd7e7] dark:divide-slate-800">
                  {loading ? (
                    <div className="p-6 text-center text-slate-400">Cargando...</div>
                  ) : filteredBusinesses.length === 0 ? (
                    <div className="p-6 text-center text-slate-400">No se encontraron empresas</div>
                  ) : (
                    filteredBusinesses.map(b => (
                      <div key={b.id} className="p-3 flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-[#135bec]/10 flex items-center justify-center text-[#135bec]">
                              <BuildingOffice2Icon className="w-[18px] h-[18px]" />
                            </div>
                            <div>
                              <p className="font-bold text-[#0d121b] dark:text-white text-sm">{b.name}</p>
                              <p className="text-xs text-[#4c669a] dark:text-slate-400">{b.ruc}</p>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${b.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {b.isActive ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-[#4c669a] dark:text-slate-400">
                            {b.plan || 'Básico'} • {b.subscriptionEnd ? new Date(b.subscriptionEnd).toLocaleDateString() : 'Sin fecha'}
                          </span>
                          <button onClick={() => setSelectedBusiness(b)} className="p-1 rounded bg-[#135bec]/10 text-[#135bec]">
                            <EyeIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}

          {/* Por Vencer Section */}
          {activeTab === 'expiring' && (() => {
            // Filtrar solo empresas que realmente están en zona de advertencia según su plan
            const filteredExpiring = expiringBusinesses.filter((b: any) => {
              if (b.plan === 'UNLIMITED') return false;
              const daysLeft = Math.ceil((new Date(b.subscriptionEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              if (daysLeft < 0) return true;
              const { amberThreshold } = getPlanThreshold(b.plan);
              return daysLeft <= amberThreshold;
            });

            return (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-[#0d121b] dark:text-white text-lg md:text-xl font-bold">Por Vencer</h2>
                  <span className="text-sm text-[#4c669a] dark:text-slate-400 font-medium">Próximos 30 días</span>
                </div>
                <button
                  onClick={loadExpiringBusinesses}
                  className="px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-[#4c669a] dark:text-slate-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Actualizar
                </button>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl border border-[#cfd7e7] dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#f8f9fc] dark:bg-slate-800/50">
                        <th className="px-4 py-3 text-[#0d121b] dark:text-white text-xs font-bold uppercase">Empresa</th>
                        <th className="px-4 py-3 text-[#0d121b] dark:text-white text-xs font-bold uppercase">RUC</th>
                        <th className="px-4 py-3 text-[#0d121b] dark:text-white text-xs font-bold uppercase">Plan</th>
                        <th className="px-4 py-3 text-[#0d121b] dark:text-white text-xs font-bold uppercase">Vence</th>
                        <th className="px-4 py-3 text-[#0d121b] dark:text-white text-xs font-bold uppercase">Días</th>
                        <th className="px-4 py-3 text-[#0d121b] dark:text-white text-xs font-bold uppercase text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#cfd7e7] dark:divide-slate-800">
                      {loadingExpiring ? (
                        <tr><td colSpan={6} className="p-8 text-center text-slate-400">Cargando...</td></tr>
                      ) : filteredExpiring.length === 0 ? (
                        <tr><td colSpan={6} className="p-8 text-center">
                          <p className="text-slate-400 font-bold">
                            {expiringBusinesses.length === 0 ? 'Sin empresas por vencer' : 'Ninguna en zona de riesgo'}
                          </p>
                          <p className="text-xs text-slate-300 mt-1">
                            {expiringBusinesses.length === 0 ? 'Todas las suscripciones están al día' : `${expiringBusinesses.length} empresa(s) tienen más del 50% de su plan restante`}
                          </p>
                        </td></tr>
                      ) : (
                        filteredExpiring.map((b: any) => {
                          const daysLeft = Math.ceil((new Date(b.subscriptionEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                          const { redThreshold } = getPlanThreshold(b.plan);
                          const isExpired = daysLeft < 0;
                          const isUrgent = daysLeft >= 0 && daysLeft <= redThreshold;
                          const daysBg = isExpired ? 'bg-red-100 text-red-700' : isUrgent ? 'bg-amber-100 text-amber-700' : 'bg-yellow-100 text-yellow-700';
                          const dateColor = isExpired ? 'text-red-600 font-bold' : isUrgent ? 'text-amber-600 font-bold' : '';
                          return (
                            <tr key={b.id} className={`hover:bg-[#135bec]/5 transition-colors ${isExpired ? 'bg-red-50/30 dark:bg-red-500/5' : isUrgent ? 'bg-amber-50/30 dark:bg-amber-500/5' : ''}`}>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-lg bg-[#135bec]/10 flex items-center justify-center text-[#135bec]">
                                    <BuildingOffice2Icon className="w-[18px] h-[18px]" />
                                  </div>
                                  <div>
                                    <p className="font-bold text-[#0d121b] dark:text-white text-sm">{b.name}</p>
                                    <p className="text-xs text-[#4c669a] dark:text-slate-400">{b.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-[#4c669a] dark:text-slate-400 text-sm">{b.ruc}</td>
                              <td className="px-4 py-3">
                                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                                  {b.plan || 'Básico'}
                                </span>
                              </td>
                              <td className={`px-4 py-3 text-sm ${dateColor}`}>
                                {b.subscriptionEnd ? new Date(b.subscriptionEnd).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${daysBg}`}>
                                  {isExpired ? `Vencido (${Math.abs(daysLeft)}d)` : `${daysLeft}d`}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => setSelectedBusiness(b)}
                                  className="p-1.5 rounded-lg bg-[#135bec]/10 text-[#135bec] hover:bg-[#135bec] hover:text-white transition-all"
                                  title="Ver detalles"
                                >
                                  <EyeIcon className="w-[18px] h-[18px]" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-[#cfd7e7] dark:divide-slate-800">
                  {loadingExpiring ? (
                    <div className="p-6 text-center text-slate-400">Cargando...</div>
                  ) : filteredExpiring.length === 0 ? (
                    <div className="p-6 text-center text-slate-400">
                      {expiringBusinesses.length === 0 ? 'Sin empresas por vencer' : `${expiringBusinesses.length} empresa(s) fuera de zona de riesgo`}
                    </div>
                  ) : (
                    filteredExpiring.map((b: any) => {
                      const daysLeft = Math.ceil((new Date(b.subscriptionEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                      const { redThreshold } = getPlanThreshold(b.plan);
                      const isExpired = daysLeft < 0;
                      const isUrgent = daysLeft >= 0 && daysLeft <= redThreshold;
                      return (
                        <div key={b.id} className={`p-3 flex flex-col gap-2 ${isExpired ? 'bg-red-50/30' : isUrgent ? 'bg-amber-50/30' : ''}`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-bold text-[#0d121b] dark:text-white text-sm">{b.name}</p>
                              <p className="text-xs text-[#4c669a] dark:text-slate-400">{b.ruc}</p>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${isExpired ? 'bg-red-100 text-red-700' : isUrgent ? 'bg-amber-100 text-amber-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {isExpired ? `Vencido ${Math.abs(daysLeft)}d` : `${daysLeft}d`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">{b.plan || 'Básico'}</span>
                            <span className={`text-xs ${isExpired ? 'text-red-600 font-bold' : 'text-[#4c669a]'}`}>
                              Vence: {b.subscriptionEnd ? new Date(b.subscriptionEnd).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
            );
          })()}

          {/* Superadmins Section */}
          {activeTab === 'superadmins' && (
            <div className="flex flex-col gap-6">
              {/* Lista de Superadmins */}
              <div className="w-full">
                <h2 className="text-[#0d121b] dark:text-white text-lg md:text-xl font-bold mb-4">Superadmins</h2>
                
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-[#cfd7e7] dark:border-slate-800 overflow-hidden shadow-sm">
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#f8f9fc] dark:bg-slate-800/50">
                          <th className="px-4 py-3 text-[#0d121b] dark:text-white text-xs font-bold uppercase">Usuario</th>
                          <th className="px-4 py-3 text-[#0d121b] dark:text-white text-xs font-bold uppercase">Email</th>
                          <th className="px-4 py-3 text-[#0d121b] dark:text-white text-xs font-bold uppercase">Estado</th>
                          <th className="px-4 py-3 text-[#0d121b] dark:text-white text-xs font-bold uppercase text-right">Ver</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#cfd7e7] dark:divide-slate-800">
                        {loading ? (
                          <tr><td colSpan={4} className="p-8 text-center text-slate-400">Cargando...</td></tr>
                        ) : (
                          users
                            .filter(u => u.role === 'SUPERADMIN')
                            .map(user => (
                              <tr key={user.id} className={`hover:bg-[#135bec]/5 transition-colors ${selectedUser?.id === user.id ? 'bg-[#135bec]/10' : ''}`}>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-sm">
                                      <ShieldCheckIcon className="w-[18px] h-[18px]" />
                                    </div>
                                    <p className="font-bold text-[#0d121b] dark:text-white text-sm">{user.name || 'Superadmin'}</p>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-[#4c669a] dark:text-slate-400 text-sm">{user.email}</td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                    {user.isActive ? 'Activo' : 'Inactivo'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <button 
                                    onClick={() => setSelectedUser(user)}
                                    className="p-1.5 rounded-lg bg-[#135bec]/10 text-[#135bec] hover:bg-[#135bec] hover:text-white transition-all"
                                  >
                                    <EyeIcon className="w-[18px] h-[18px]" />
                                  </button>
                                </td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Mobile View */}
                  <div className="md:hidden divide-y divide-[#cfd7e7] dark:divide-slate-800">
                    {users
                      .filter(u => u.role === 'SUPERADMIN')
                      .map(user => (
                        <div key={user.id} className={`p-3 flex flex-col gap-2 ${selectedUser?.id === user.id ? 'bg-[#135bec]/10' : ''}`}>
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                                <ShieldCheckIcon className="w-[18px] h-[18px]" />
                              </div>
                              <div>
                                <p className="font-bold text-[#0d121b] dark:text-white text-sm">{user.name || 'Superadmin'}</p>
                                <p className="text-xs text-[#4c669a] dark:text-slate-400">{user.email}</p>
                              </div>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${user.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                              {user.isActive ? 'Activo' : 'Inactivo'}
                            </span>
                          </div>
                          <div className="flex justify-end">
                            <button onClick={() => setSelectedUser(user)} className="p-1 rounded bg-[#135bec]/10 text-[#135bec]">
                              <EyeIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              {/* Panel de Detalles del Superadmin Seleccionado */}
              {selectedUser && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[#0d121b] dark:text-white text-lg md:text-xl font-bold">Detalles del Superadmin</h2>
                    <button onClick={() => setSelectedUser(null)} className="text-[#4c669a] hover:text-[#135bec]">
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* User Info */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-[#cfd7e7] dark:border-slate-800 p-4 shadow-sm">
                      <h3 className="font-bold text-[#0d121b] dark:text-white mb-3 flex items-center gap-2">
                        <ShieldCheckIcon className="w-5 h-5 text-red-500" />
                        Información
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-[#4c669a] dark:text-slate-400">Nombre:</span>
                          <span className="font-medium text-[#0d121b] dark:text-white">{selectedUser.name || 'Superadmin'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#4c669a] dark:text-slate-400">Email:</span>
                          <span className="font-medium text-[#0d121b] dark:text-white">{selectedUser.email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#4c669a] dark:text-slate-400">Estado:</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${selectedUser.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {selectedUser.isActive ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-[#cfd7e7] dark:border-slate-800 p-4 shadow-sm">
                      <h3 className="font-bold text-[#0d121b] dark:text-white mb-3 flex items-center gap-2">
                        <Cog6ToothIcon className="w-5 h-5 text-[#135bec]" />
                        Acciones
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <button
                          onClick={() => { setSelectedUserToReset(selectedUser); setTempPassword(''); setShowResetUserModal(true); }}
                          className="flex items-center justify-center gap-2 py-2 px-3 bg-slate-100 dark:bg-slate-800 text-[#0d121b] dark:text-white rounded-lg text-sm font-medium hover:bg-[#135bec] hover:text-white transition-all"
                        >
                          <ArrowPathIcon className="w-[18px] h-[18px]" />
                          Password
                        </button>
                        <button
                          onClick={() => handleToggleUserStatus(selectedUser)}
                          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${selectedUser.isActive ? 'bg-amber-100 text-amber-600 hover:bg-amber-600 hover:text-white' : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-600 hover:text-white'}`}
                        >
                          {selectedUser.isActive ? <PauseIcon className="w-[18px] h-[18px]" /> : <PlayIcon className="w-[18px] h-[18px]" />}
                          {selectedUser.isActive ? 'Desactivar' : 'Activar'}
                        </button>
                        <button
                          onClick={() => { setUserToDelete(selectedUser); setShowUserDeleteModal(true); }}
                          className="flex items-center justify-center gap-2 py-2 px-3 bg-red-100 text-red-600 rounded-lg text-sm font-medium hover:bg-red-600 hover:text-white transition-all"
                        >
                          <TrashIcon className="w-[18px] h-[18px]" />
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Users Section - Usuarios de Empresas */}
          {activeTab === 'users' && (
            <div className="flex flex-col gap-6">
              {/* Lista de Usuarios */}
              <div className="w-full">
                <h2 className="text-[#0d121b] dark:text-white text-lg md:text-xl font-bold mb-4">Usuarios de Empresas</h2>
                
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-[#cfd7e7] dark:border-slate-800 overflow-hidden shadow-sm">
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#f8f9fc] dark:bg-slate-800/50">
                          <th className="px-4 py-3 text-[#0d121b] dark:text-white text-xs font-bold uppercase">Usuario</th>
                          <th className="px-4 py-3 text-[#0d121b] dark:text-white text-xs font-bold uppercase">Empresa</th>
                          <th className="px-4 py-3 text-[#0d121b] dark:text-white text-xs font-bold uppercase">Rol</th>
                          <th className="px-4 py-3 text-[#0d121b] dark:text-white text-xs font-bold uppercase">Estado</th>
                          <th className="px-4 py-3 text-[#0d121b] dark:text-white text-xs font-bold uppercase text-right">Ver</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#cfd7e7] dark:divide-slate-800">
                        {loading ? (
                          <tr><td colSpan={5} className="p-8 text-center text-slate-400">Cargando...</td></tr>
                        ) : users.filter(u => u.role !== 'SUPERADMIN').length === 0 ? (
                          <tr><td colSpan={5} className="p-8 text-center text-slate-400">No se encontraron usuarios de empresas</td></tr>
                        ) : (
                          users.filter(u => u.role !== 'SUPERADMIN').map(user => (
                            <tr key={user.id} className={`hover:bg-[#135bec]/5 transition-colors ${selectedUser?.id === user.id ? 'bg-[#135bec]/10' : ''}`}>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-full bg-[#135bec]/10 flex items-center justify-center text-[#135bec] font-bold text-sm">
                                    {user.email.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="font-bold text-[#0d121b] dark:text-white text-sm">{user.email}</p>
                                    {user.name && <p className="text-xs text-[#4c669a] dark:text-slate-400">{user.name}</p>}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-[#4c669a] dark:text-slate-400 text-sm">
                                {user.business?.name || 'N/A'}
                              </td>
                              <td className="px-4 py-3">
                                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                                  {user.role}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                  {user.isActive ? 'Activo' : 'Inactivo'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button 
                                  onClick={() => setSelectedUser(user)}
                                  className="p-1.5 rounded-lg bg-[#135bec]/10 text-[#135bec] hover:bg-[#135bec] hover:text-white transition-all"
                                >
                                  <EyeIcon className="w-[18px] h-[18px]" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Mobile Users View */}
                  <div className="md:hidden divide-y divide-[#cfd7e7] dark:divide-slate-800">
                    {loading ? (
                      <div className="p-6 text-center text-slate-400">Cargando...</div>
                    ) : users.filter(u => u.role !== 'SUPERADMIN').length === 0 ? (
                      <div className="p-6 text-center text-slate-400">No se encontraron usuarios de empresas</div>
                    ) : (
                      users.filter(u => u.role !== 'SUPERADMIN').map(user => (
                        <div key={user.id} className={`p-3 flex flex-col gap-2 ${selectedUser?.id === user.id ? 'bg-[#135bec]/10' : ''}`}>
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-[#135bec]/10 flex items-center justify-center text-[#135bec] font-bold text-sm">
                                {user.email.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-[#0d121b] dark:text-white text-sm">{user.email}</p>
                                <p className="text-xs text-[#4c669a] dark:text-slate-400">{user.business?.name || 'Sin empresa'}</p>
                              </div>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${user.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                              {user.isActive ? 'Activo' : 'Inactivo'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-[#4c669a] dark:text-slate-400">{user.role}</span>
                            <button onClick={() => setSelectedUser(user)} className="p-1 rounded bg-[#135bec]/10 text-[#135bec]">
                              <EyeIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Panel de Detalles del Usuario Seleccionado */}
              {selectedUser && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[#0d121b] dark:text-white text-lg md:text-xl font-bold">Detalles del Usuario</h2>
                    <button onClick={() => setSelectedUser(null)} className="text-[#4c669a] hover:text-[#135bec]">
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* User Info */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-[#cfd7e7] dark:border-slate-800 p-4 shadow-sm">
                      <h3 className="font-bold text-[#0d121b] dark:text-white mb-3 flex items-center gap-2">
                        <UserIcon className="w-5 h-5 text-[#135bec]" />
                        Información
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-[#4c669a] dark:text-slate-400">Email:</span>
                          <span className="font-medium text-[#0d121b] dark:text-white">{selectedUser.email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#4c669a] dark:text-slate-400">Nombre:</span>
                          <span className="font-medium text-[#0d121b] dark:text-white">{selectedUser.name || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#4c669a] dark:text-slate-400">Empresa:</span>
                          <span className="font-medium text-[#0d121b] dark:text-white">{selectedUser.business?.name || 'Sin empresa'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#4c669a] dark:text-slate-400">Rol:</span>
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">{selectedUser.role}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#4c669a] dark:text-slate-400">Estado:</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${selectedUser.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {selectedUser.isActive ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-[#cfd7e7] dark:border-slate-800 p-4 shadow-sm">
                      <h3 className="font-bold text-[#0d121b] dark:text-white mb-3 flex items-center gap-2">
                        <Cog6ToothIcon className="w-5 h-5 text-[#135bec]" />
                        Acciones
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          onClick={() => { setSelectedUserToEdit(selectedUser); setEditUserForm({ name: selectedUser.name || '', role: selectedUser.role }); setShowEditUserModal(true); }}
                          className="flex items-center justify-center gap-2 py-2 px-3 bg-purple-100 text-purple-600 rounded-lg text-sm font-medium hover:bg-purple-600 hover:text-white transition-all"
                        >
                          <PencilIcon className="w-[18px] h-[18px]" />
                          Editar
                        </button>
                        <button
                          onClick={() => { setSelectedUserToReset(selectedUser); setTempPassword(''); setShowResetUserModal(true); }}
                          className="flex items-center justify-center gap-2 py-2 px-3 bg-slate-100 dark:bg-slate-800 text-[#0d121b] dark:text-white rounded-lg text-sm font-medium hover:bg-[#135bec] hover:text-white transition-all"
                        >
                          <ArrowPathIcon className="w-[18px] h-[18px]" />
                          Password
                        </button>
                        <button
                          onClick={() => handleToggleUserStatus(selectedUser)}
                          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${selectedUser.isActive ? 'bg-amber-100 text-amber-600 hover:bg-amber-600 hover:text-white' : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-600 hover:text-white'}`}
                        >
                          {selectedUser.isActive ? <PauseIcon className="w-[18px] h-[18px]" /> : <PlayIcon className="w-[18px] h-[18px]" />}
                          {selectedUser.isActive ? 'Desactivar' : 'Activar'}
                        </button>
                        <button
                          onClick={() => { setUserToDelete(selectedUser); setShowUserDeleteModal(true); }}
                          className="flex items-center justify-center gap-2 py-2 px-3 bg-red-100 text-red-600 rounded-lg text-sm font-medium hover:bg-red-600 hover:text-white transition-all"
                        >
                          <TrashIcon className="w-[18px] h-[18px]" />
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Subscription Payments Section - Historial de Pagos de Suscripciones */}
          {activeTab === 'subscription-payments' && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <h2 className="text-[#0d121b] dark:text-white text-lg md:text-xl font-bold">Pagos de Suscripciones</h2>
              </div>
              
              {loadingPayments ? (
                <div className="text-center py-8 text-[#4c669a] dark:text-slate-400">
                  Cargando pagos...
                </div>
              ) : subscriptionPayments.length === 0 ? (
                <div className="text-center py-8 text-[#4c669a] dark:text-slate-400">
                  No hay pagos de suscripciones registrados.
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-[#cfd7e7] dark:border-slate-800 overflow-hidden shadow-sm">
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#f8f9fc] dark:bg-slate-800/50">
                          <th className="px-4 py-3 text-[#0d121b] dark:text-white text-xs font-bold uppercase">Empresa</th>
                          <th className="px-4 py-3 text-[#0d121b] dark:text-white text-xs font-bold uppercase">Plan</th>
                          <th className="px-4 py-3 text-[#0d121b] dark:text-white text-xs font-bold uppercase">Monto</th>
                          <th className="px-4 py-3 text-[#0d121b] dark:text-white text-xs font-bold uppercase">Inicio</th>
                          <th className="px-4 py-3 text-[#0d121b] dark:text-white text-xs font-bold uppercase">Fin</th>
                          <th className="px-4 py-3 text-[#0d121b] dark:text-white text-xs font-bold uppercase">Estado</th>
                          <th className="px-4 py-3 text-[#0d121b] dark:text-white text-xs font-bold uppercase text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subscriptionPayments.map((payment) => (
                          <tr key={payment.id} className="border-t border-[#cfd7e7] dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="px-4 py-3">
                              <div className="font-medium text-[#0d121b] dark:text-white">
                                {payment.business?.name || 'N/A'}
                              </div>
                              <div className="text-xs text-[#4c669a] dark:text-slate-400">
                                {payment.business?.ruc || 'N/A'}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium">
                                {payment.plan}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-medium text-[#0d121b] dark:text-white">
                              ${payment.amount?.toFixed(2) || '0.00'}
                            </td>
                            <td className="px-4 py-3 text-sm text-[#0d121b] dark:text-white">
                              {payment.startDate ? new Date(payment.startDate).toLocaleDateString('es-EC') : 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm text-[#0d121b] dark:text-white">
                              {payment.endDate ? new Date(payment.endDate).toLocaleDateString('es-EC') : 'N/A'}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                payment.status === 'ACTIVE' 
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                              }`}>
                                {payment.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => { setPaymentToDelete(payment); setShowDeletePaymentModal(true); }}
                                className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                title="Eliminar"
                              >
                                <TrashIcon className="w-[18px] h-[18px]" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Mobile View */}
                  <div className="md:hidden divide-y divide-[#cfd7e7] dark:divide-slate-800">
                    {subscriptionPayments.map((payment) => (
                      <div key={payment.id} className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-medium text-[#0d121b] dark:text-white">
                              {payment.business?.name || 'N/A'}
                            </div>
                            <div className="text-xs text-[#4c669a] dark:text-slate-400">
                              {payment.business?.ruc || 'N/A'}
                            </div>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            payment.status === 'ACTIVE' 
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                          }`}>
                            {payment.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                          <div>
                            <span className="text-[#4c669a] dark:text-slate-400">Plan:</span>
                            <span className="ml-2 font-medium text-[#0d121b] dark:text-white">{payment.plan}</span>
                          </div>
                          <div>
                            <span className="text-[#4c669a] dark:text-slate-400">Monto:</span>
                            <span className="ml-2 font-medium text-[#0d121b] dark:text-white">${payment.amount?.toFixed(2) || '0.00'}</span>
                          </div>
                          <div>
                            <span className="text-[#4c669a] dark:text-slate-400">Inicio:</span>
                            <span className="ml-2 font-medium text-[#0d121b] dark:text-white">
                              {payment.startDate ? new Date(payment.startDate).toLocaleDateString('es-EC') : 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[#4c669a] dark:text-slate-400">Fin:</span>
                            <span className="ml-2 font-medium text-[#0d121b] dark:text-white">
                              {payment.endDate ? new Date(payment.endDate).toLocaleDateString('es-EC') : 'N/A'}
                            </span>
                          </div>
                        </div>
                        <div className="mt-3 flex justify-end">
                          <button
                            onClick={() => { setPaymentToDelete(payment); setShowDeletePaymentModal(true); }}
                            className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          >
                            <TrashIcon className="w-[18px] h-[18px]" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Selected Business Details */}
          {selectedBusiness && activeTab === 'businesses' && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[#0d121b] dark:text-white text-lg md:text-xl font-bold">Detalles de {selectedBusiness.name}</h2>
                <button onClick={() => setSelectedBusiness(null)} className="text-[#4c669a] hover:text-[#135bec]">
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Business Info */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-[#cfd7e7] dark:border-slate-800 p-4 shadow-sm">
                  <h3 className="font-bold text-[#0d121b] dark:text-white mb-3 flex items-center gap-2">
                    <BuildingOffice2Icon className="w-5 h-5 text-[#135bec]" />
                    Información
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#4c669a] dark:text-slate-400">RUC:</span>
                      <span className="font-medium text-[#0d121b] dark:text-white">{selectedBusiness.ruc}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#4c669a] dark:text-slate-400">Email:</span>
                      <span className="font-medium text-[#0d121b] dark:text-white">{selectedBusiness.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#4c669a] dark:text-slate-400">Plan:</span>
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                        {selectedBusiness.plan || 'Básico'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#4c669a] dark:text-slate-400">Estado:</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${selectedBusiness.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {selectedBusiness.isActive ? 'Operativo' : 'Suspendido'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#4c669a] dark:text-slate-400">Vence:</span>
                      <span className={`font-medium ${new Date(selectedBusiness.subscriptionEnd || '') < new Date() ? 'text-red-600' : 'text-[#0d121b] dark:text-white'}`}>
                        {selectedBusiness.subscriptionEnd ? new Date(selectedBusiness.subscriptionEnd).toLocaleDateString() : 'Sin fecha'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Users */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-[#cfd7e7] dark:border-slate-800 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-[#0d121b] dark:text-white flex items-center gap-2">
                      <UsersIcon className="w-5 h-5 text-[#135bec]" />
                      Usuarios ({businessUsers.length})
                    </h3>
                    <button
                      onClick={() => setShowNewUserModal(true)}
                      className="text-xs flex items-center gap-1 px-2 py-1 bg-[#135bec] text-white rounded-lg"
                    >
                      <PlusIcon className="w-3.5 h-3.5" />
                      Agregar
                    </button>
                  </div>
                  
                  {businessUsers.length === 0 ? (
                    <p className="text-sm text-[#4c669a] dark:text-slate-400 text-center py-2">Sin usuarios</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {businessUsers.map(user => (
                        <div key={user.id} className="flex items-center justify-between p-2 bg-[#f8f9fc] dark:bg-slate-800/50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-[#135bec]/10 flex items-center justify-center text-[#135bec] font-bold text-xs">
                              {user.email.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-xs font-medium text-[#0d121b] dark:text-white">{user.email}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-[#cfd7e7] dark:border-slate-800 p-4 shadow-sm md:col-span-2">
                  <h3 className="font-bold text-[#0d121b] dark:text-white mb-3 flex items-center gap-2">
                    <Cog6ToothIcon className="w-5 h-5 text-[#135bec]" />
                    Acciones
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <button
                      onClick={() => {
                        if (selectedBusiness) {
                          setEditBusinessForm({
                            name: selectedBusiness.name,
                            ruc: selectedBusiness.ruc,
                            email: selectedBusiness.email,
                            phone: selectedBusiness.phone || '',
                            address: selectedBusiness.address || '',
                            plan: selectedBusiness.plan || 'FREE'
                          });
                          setShowEditBusinessModal(true);
                        }
                      }}
                      className="flex items-center justify-center gap-2 py-2 px-3 bg-purple-100 text-purple-600 rounded-lg text-sm font-medium hover:bg-purple-600 hover:text-white transition-all"
                    >
                      <PencilIcon className="w-[18px] h-[18px]" />
                      Editar
                    </button>
                    <button
                      onClick={() => handleResetAdminPassword()}
                      className="flex items-center justify-center gap-2 py-2 px-3 bg-[#135bec]/10 text-[#135bec] rounded-lg text-sm font-medium hover:bg-[#135bec] hover:text-white transition-all"
                    >
                      <ArrowPathIcon className="w-[18px] h-[18px]" />
                      Resetear Password
                    </button>
                    <button
                      onClick={() => toggleBusinessStatus(selectedBusiness.id, selectedBusiness.isActive)}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                        selectedBusiness.isActive 
                          ? 'bg-amber-100 text-amber-600 hover:bg-amber-600 hover:text-white' 
                          : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-600 hover:text-white'
                      }`}
                    >
                      {selectedBusiness.isActive ? <PauseIcon className="w-[18px] h-[18px]" /> : <PlayIcon className="w-[18px] h-[18px]" />}
                      {selectedBusiness.isActive ? 'Pausar' : 'Activar'}
                    </button>
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="flex items-center justify-center gap-2 py-2 px-3 bg-red-100 text-red-600 rounded-lg text-sm font-medium hover:bg-red-600 hover:text-white transition-all"
                    >
                      <TrashIcon className="w-[18px] h-[18px]" />
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
        
        {/* Footer */}
        <footer className="max-w-7xl mx-auto px-4 py-6">
          <div className="border-t border-[#cfd7e7] dark:border-slate-800 pt-4 flex flex-col sm:flex-row justify-between items-center gap-2">
            <p className="text-xs text-[#4c669a] dark:text-slate-500">© 2024 Panel SaaS Admin</p>
            <div className="flex gap-4">
              <a className="text-xs text-[#4c669a] dark:text-slate-500 hover:text-[#135bec]" href="#">Términos</a>
              <a className="text-xs text-[#4c669a] dark:text-slate-500 hover:text-[#135bec]" href="#">Privacidad</a>
            </div>
          </div>
        </footer>

        {/* MODAL CREAR SUPERADMIN */}
        {showUserModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
              <div className="bg-white dark:bg-slate-900 rounded-xl p-5 w-full max-w-md shadow-xl">
                  <h3 className="text-lg font-bold text-[#0d121b] dark:text-white mb-4">Nuevo Superadmin</h3>
                  <form onSubmit={handleCreateUser} className="space-y-3">
                      <div>
                          <label className="text-xs font-semibold text-[#4c669a] dark:text-slate-400">Correo</label>
                          <input 
                              type="email" 
                              required
                              className="mt-1 w-full p-2.5 border border-[#cfd7e7] dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-sm focus:border-[#135bec] outline-none"
                              value={userFormData.email}
                              onChange={e => setUserFormData({...userFormData, email: e.target.value})}
                          />
                      </div>
                      <div className="relative">
                          <label className="text-xs font-semibold text-[#4c669a] dark:text-slate-400">Contraseña</label>
                          <input 
                              type={showPassword ? "text" : "password"}
                              required
                              className="mt-1 w-full p-2.5 border border-[#cfd7e7] dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-sm focus:border-[#135bec] outline-none"
                              value={userFormData.password}
                              onChange={e => setUserFormData({...userFormData, password: e.target.value})}
                          />
                          <button type="button" className="absolute right-2 top-8 text-slate-400" onClick={() => setShowPassword(!showPassword)}>
                              {showPassword ? <EyeSlashIcon className="w-[18px] h-[18px]" /> : <EyeIcon className="w-[18px] h-[18px]" />}
                          </button>
                      </div>
                      <div className="relative">
                          <label className="text-xs font-semibold text-[#4c669a] dark:text-slate-400">Confirmar</label>
                          <input 
                              type={showPassword ? "text" : "password"}
                              required
                              className="mt-1 w-full p-2.5 pr-10 border border-[#cfd7e7] dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-sm focus:border-[#135bec] outline-none"
                              value={userFormData.confirmPassword}
                              onChange={e => setUserFormData({...userFormData, confirmPassword: e.target.value})}
                          />
                          <button type="button" className="absolute right-2 top-8 text-slate-400 hover:text-slate-600" onClick={() => setShowPassword(!showPassword)}>
                              {showPassword ? <EyeSlashIcon className="w-[18px] h-[18px]" /> : <EyeIcon className="w-[18px] h-[18px]" />}
                          </button>
                      </div>
                      <div className="flex gap-2 pt-2">
                          <button type="button" onClick={() => setShowUserModal(false)} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-[#4c669a] hover:bg-slate-100 dark:hover:bg-slate-800">Cancelar</button>
                          <button type="submit" className="flex-1 py-2.5 bg-[#135bec] text-white rounded-lg text-sm font-medium hover:opacity-90">Crear</button>
                      </div>
                  </form>
              </div>
          </div>
        )}

        {/* MODAL CREAR EMPRESA */}
        {showBusinessModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
              <div className="bg-white dark:bg-slate-900 rounded-xl p-5 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
                  <h3 className="text-lg font-bold text-[#0d121b] dark:text-white mb-4">Nueva Empresa</h3>
                  <form onSubmit={handleCreateBusiness} className="space-y-3">
                      <div>
                          <label className="text-xs font-semibold text-[#4c669a] dark:text-slate-400">Razón Social</label>
                          <input required className="mt-1 w-full p-2.5 border border-[#cfd7e7] dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-sm focus:border-[#135bec] outline-none"
                              value={businessFormData.name} onChange={e => setBusinessFormData({...businessFormData, name: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-[#4c669a] dark:text-slate-400">RUC</label>
                            <input required className="mt-1 w-full p-2.5 border border-[#cfd7e7] dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-sm focus:border-[#135bec] outline-none"
                                value={businessFormData.ruc} onChange={e => setBusinessFormData({...businessFormData, ruc: e.target.value})} />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-[#4c669a] dark:text-slate-400">Email</label>
                            <input type="email" required className="mt-1 w-full p-2.5 border border-[#cfd7e7] dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-sm focus:border-[#135bec] outline-none"
                                value={businessFormData.email} onChange={e => setBusinessFormData({...businessFormData, email: e.target.value})} />
                        </div>
                      </div>
                      <div className="relative">
                          <label className="text-xs font-semibold text-[#4c669a] dark:text-slate-400">Password Admin</label>
                          <input type={showPassword ? "text" : "password"} required className="mt-1 w-full p-2.5 pr-10 border border-[#cfd7e7] dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-sm focus:border-[#135bec] outline-none"
                              value={businessFormData.password} onChange={e => setBusinessFormData({...businessFormData, password: e.target.value})} />
                          <button type="button" className="absolute right-2 top-8 text-slate-400 hover:text-slate-600" onClick={() => setShowPassword(!showPassword)}>
                              {showPassword ? <EyeSlashIcon className="w-[18px] h-[18px]" /> : <EyeIcon className="w-[18px] h-[18px]" />}
                          </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-[#4c669a] dark:text-slate-400">Teléfono</label>
                            <input className="mt-1 w-full p-2.5 border border-[#cfd7e7] dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-sm focus:border-[#135bec] outline-none"
                                value={businessFormData.phone} onChange={e => setBusinessFormData({...businessFormData, phone: e.target.value})} />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-[#4c669a] dark:text-slate-400">Dirección</label>
                            <input className="mt-1 w-full p-2.5 border border-[#cfd7e7] dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-sm focus:border-[#135bec] outline-none"
                                value={businessFormData.address} onChange={e => setBusinessFormData({...businessFormData, address: e.target.value})} />
                        </div>
                      </div>
                      <div>
                          <label className="text-xs font-semibold text-[#4c669a] dark:text-slate-400">Tipo de Negocio</label>
                          <select className="mt-1 w-full p-2.5 border border-[#cfd7e7] dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-sm focus:border-[#135bec] outline-none"
                              value={businessFormData.businessType} onChange={e => setBusinessFormData({...businessFormData, businessType: e.target.value})}>
                              {Object.entries(BUSINESS_TYPES).map(([key, val]) => (
                                  <option key={key} value={key}>{val.icon} {val.label}</option>
                              ))}
                          </select>
                      </div>
                      <div className="flex gap-2 pt-2">
                          <button type="button" onClick={() => setShowBusinessModal(false)} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-[#4c669a] hover:bg-slate-100 dark:hover:bg-slate-800">Cancelar</button>
                          <button type="submit" className="flex-1 py-2.5 bg-[#135bec] text-white rounded-lg text-sm font-medium hover:opacity-90">Registrar</button>
                      </div>
                  </form>
              </div>
          </div>
        )}

        {/* MODAL EDITAR EMPRESA */}
        {showEditBusinessModal && selectedBusiness && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
              <div className="bg-white dark:bg-slate-900 rounded-xl p-5 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
                  <h3 className="text-lg font-bold text-[#0d121b] dark:text-white mb-4">Editar Empresa</h3>
                  <form onSubmit={handleUpdateBusiness} className="space-y-3">
                      <div>
                          <label className="text-xs font-semibold text-[#4c669a] dark:text-slate-400">Razón Social</label>
                          <input required className="mt-1 w-full p-2.5 border border-[#cfd7e7] dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-sm focus:border-[#135bec] outline-none"
                              value={editBusinessForm.name} onChange={e => setEditBusinessForm({...editBusinessForm, name: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-[#4c669a] dark:text-slate-400">RUC</label>
                            <input required className="mt-1 w-full p-2.5 border border-[#cfd7e7] dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-sm focus:border-[#135bec] outline-none"
                                value={editBusinessForm.ruc} onChange={e => setEditBusinessForm({...editBusinessForm, ruc: e.target.value})} />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-[#4c669a] dark:text-slate-400">Plan</label>
                            <div className="mt-1 w-full p-2.5 border border-[#cfd7e7] dark:border-slate-700 dark:bg-slate-800/50 dark:text-white rounded-lg text-sm bg-slate-50 dark:bg-slate-800/50">
                                {selectedBusiness.plan === 'MONTHLY' ? 'Mensual' :
                                 selectedBusiness.plan === 'SEMIANNUAL' ? 'Semestral' :
                                 selectedBusiness.plan === 'YEARLY' ? 'Anual' :
                                 selectedBusiness.plan === 'PENDING' ? 'Pendiente' :
                                 selectedBusiness.plan === 'FREE' ? 'Plan Free' :
                                 selectedBusiness.plan === 'BASIC' ? 'Plan Basic' :
                                 selectedBusiness.plan === 'PRO' ? 'Plan Pro' :
                                 selectedBusiness.plan === 'ENTERPRISE' ? 'Plan Enterprise' :
                                 selectedBusiness.plan === 'UNLIMITED' ? '∞ Plan Ilimitado' :
                                 selectedBusiness.plan || 'No definido'}
                            </div>
                        </div>
                      </div>
                      <div>
                          <label className="text-xs font-semibold text-[#4c669a] dark:text-slate-400">Email</label>
                          <input type="email" required className="mt-1 w-full p-2.5 border border-[#cfd7e7] dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-sm focus:border-[#135bec] outline-none"
                              value={editBusinessForm.email} onChange={e => setEditBusinessForm({...editBusinessForm, email: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-[#4c669a] dark:text-slate-400">Teléfono</label>
                            <input className="mt-1 w-full p-2.5 border border-[#cfd7e7] dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-sm focus:border-[#135bec] outline-none"
                                value={editBusinessForm.phone} onChange={e => setEditBusinessForm({...editBusinessForm, phone: e.target.value})} />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-[#4c669a] dark:text-slate-400">Dirección</label>
                            <input className="mt-1 w-full p-2.5 border border-[#cfd7e7] dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-sm focus:border-[#135bec] outline-none"
                                value={editBusinessForm.address} onChange={e => setEditBusinessForm({...editBusinessForm, address: e.target.value})} />
                        </div>
                      </div>
                      <div>
                          <label className="text-xs font-semibold text-[#4c669a] dark:text-slate-400">Tipo de Negocio</label>
                          <select className="mt-1 w-full p-2.5 border border-[#cfd7e7] dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-sm focus:border-[#135bec] outline-none"
                              value={editBusinessForm.businessType} onChange={e => setEditBusinessForm({...editBusinessForm, businessType: e.target.value})}>
                              {Object.entries(BUSINESS_TYPES).map(([key, val]) => (
                                  <option key={key} value={key}>{val.icon} {val.label}</option>
                              ))}
                          </select>
                      </div>
                      <div className="flex gap-2 pt-2">
                          <button type="button" onClick={() => setShowEditBusinessModal(false)} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-[#4c669a] hover:bg-slate-100 dark:hover:bg-slate-800">Cancelar</button>
                          <button type="submit" className="flex-1 py-2.5 bg-[#135bec] text-white rounded-lg text-sm font-medium hover:opacity-90">Guardar</button>
                      </div>
                  </form>
              </div>
          </div>
        )}

        {/* MODAL ELIMINAR EMPRESA */}
        {showDeleteModal && selectedBusiness && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl p-5 w-full max-w-sm shadow-xl text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <TrashIcon className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-[#0d121b] dark:text-white mb-2">¿Eliminar?</h3>
              <p className="text-xs text-[#4c669a] dark:text-slate-400 mb-4">¿Eliminar <strong>{selectedBusiness.name}</strong>?</p>
              <div className="flex gap-2">
                <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-[#4c669a] hover:bg-slate-100 dark:hover:bg-slate-800">Cancelar</button>
                <button onClick={handleDeleteBusiness} className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">Eliminar</button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL ELIMINAR PAGO DE SUSCRIPCIÓN */}
        {showDeletePaymentModal && paymentToDelete && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl p-5 w-full max-w-sm shadow-xl text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <TrashIcon className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-[#0d121b] dark:text-white mb-2">¿Eliminar Pago?</h3>
              <p className="text-xs text-[#4c669a] dark:text-slate-400 mb-4">
                ¿Eliminar el pago de <strong>{paymentToDelete.business?.name}</strong> por <strong>${paymentToDelete.amount?.toFixed(2)}</strong>?
              </p>
              <div className="flex gap-2">
                <button onClick={() => { setShowDeletePaymentModal(false); setPaymentToDelete(null); }} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-[#4c669a] hover:bg-slate-100 dark:hover:bg-slate-800">Cancelar</button>
                <button onClick={handleDeletePayment} disabled={processing} className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">Eliminar</button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL CREAR USUARIO */}
        {showNewUserModal && selectedBusiness && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
              <div className="bg-white dark:bg-slate-900 rounded-xl p-5 w-full max-w-md shadow-xl">
                  <h3 className="text-lg font-bold text-[#0d121b] dark:text-white mb-1">Nuevo Usuario</h3>
                  <p className="text-xs text-[#4c669a] dark:text-slate-400 mb-4">{selectedBusiness.name}</p>
                  <form onSubmit={handleCreateBusinessUser} className="space-y-3">
                      <div>
                          <label className="text-xs font-semibold text-[#4c669a] dark:text-slate-400">Email</label>
                          <input type="email" required className="mt-1 w-full p-2.5 border border-[#cfd7e7] dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-sm focus:border-[#135bec] outline-none"
                              value={newUserFormData.email} onChange={e => setNewUserFormData({...newUserFormData, email: e.target.value})} />
                      </div>
                      <div className="relative">
                          <label className="text-xs font-semibold text-[#4c669a] dark:text-slate-400">Password</label>
                          <input type={showPassword ? "text" : "password"} required className="mt-1 w-full p-2.5 pr-10 border border-[#cfd7e7] dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-sm focus:border-[#135bec] outline-none"
                              value={newUserFormData.password} onChange={e => setNewUserFormData({...newUserFormData, password: e.target.value})} />
                          <button type="button" className="absolute right-2 top-8 text-slate-400 hover:text-slate-600" onClick={() => setShowPassword(!showPassword)}>
                              {showPassword ? <EyeSlashIcon className="w-[18px] h-[18px]" /> : <EyeIcon className="w-[18px] h-[18px]" />}
                          </button>
                      </div>
                      <div>
                          <label className="text-xs font-semibold text-[#4c669a] dark:text-slate-400">Rol</label>
                          <select className="mt-1 w-full p-2.5 border border-[#cfd7e7] dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-sm focus:border-[#135bec] outline-none"
                              value={newUserFormData.role} onChange={e => setNewUserFormData({...newUserFormData, role: e.target.value})}>
                              <option value="ADMIN">Admin</option>
                              <option value="USER">Usuario</option>
                          </select>
                      </div>
                      <div className="flex gap-2 pt-2">
                          <button type="button" onClick={() => setShowNewUserModal(false)} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-[#4c669a] hover:bg-slate-100 dark:hover:bg-slate-800">Cancelar</button>
                          <button type="submit" className="flex-1 py-2.5 bg-[#135bec] text-white rounded-lg text-sm font-medium hover:opacity-90">Crear</button>
                      </div>
                  </form>
              </div>
          </div>
        )}

        {/* MODAL ELIMINAR USUARIO */}
        {showUserDeleteModal && userToDelete && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl p-5 w-full max-w-sm shadow-xl text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <UserMinusIcon className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-[#0d121b] dark:text-white mb-2">¿Eliminar usuario?</h3>
              <p className="text-xs text-[#4c669a] dark:text-slate-400 mb-4">{userToDelete.email}</p>
              <div className="flex gap-2">
                <button onClick={() => setShowUserDeleteModal(false)} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-[#4c669a] hover:bg-slate-100 dark:hover:bg-slate-800">Cancelar</button>
                <button onClick={handleDeleteUser} className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">Eliminar</button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL RESETEAR PASSWORD USUARIO */}
        {showResetUserModal && selectedUserToReset && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
              <div className="bg-white dark:bg-slate-900 rounded-xl p-5 w-full max-w-md shadow-xl">
                  <h3 className="text-lg font-bold text-[#0d121b] dark:text-white mb-1">Resetear Password</h3>
                  <p className="text-xs text-[#4c669a] dark:text-slate-400 mb-4">{selectedUserToReset.email}</p>
                  <form onSubmit={(e) => { e.preventDefault(); handleResetUserPassword(); }} className="space-y-3">
                      <div className="relative">
                          <label className="text-xs font-semibold text-[#4c669a] dark:text-slate-400">Nueva Password</label>
                          <input type={showPassword ? "text" : "password"} required className="mt-1 w-full p-2.5 pr-10 border border-[#cfd7e7] dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-sm focus:border-[#135bec] outline-none"
                              value={tempPassword} onChange={e => setTempPassword(e.target.value)} placeholder="Nueva password" />
                          <button type="button" className="absolute right-2 top-8 text-slate-400 hover:text-slate-600" onClick={() => setShowPassword(!showPassword)}>
                              {showPassword ? <EyeSlashIcon className="w-[18px] h-[18px]" /> : <EyeIcon className="w-[18px] h-[18px]" />}
                          </button>
                      </div>
                      <div className="flex gap-2 pt-2">
                          <button type="button" onClick={() => { setShowResetUserModal(false); setTempPassword(''); }} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-[#4c669a] hover:bg-slate-100 dark:hover:bg-slate-800">Cancelar</button>
                          <button type="submit" className="flex-1 py-2.5 bg-[#135bec] text-white rounded-lg text-sm font-medium hover:opacity-90">Resetear</button>
                      </div>
                  </form>
              </div>
          </div>
        )}

        {/* MODAL RESETEAR PASSWORD ADMIN EMPRESA */}
        {showResetAdminModal && selectedAdminUser && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
              <div className="bg-white dark:bg-slate-900 rounded-xl p-5 w-full max-w-md shadow-xl">
                  <h3 className="text-lg font-bold text-[#0d121b] dark:text-white mb-1">Resetear Password Admin</h3>
                  <p className="text-xs text-[#4c669a] dark:text-slate-400 mb-4">{selectedAdminUser.email}</p>
                  <form onSubmit={(e) => { e.preventDefault(); confirmResetAdminPassword(); }} className="space-y-3">
                      <div className="relative">
                          <label className="text-xs font-semibold text-[#4c669a] dark:text-slate-400">Nueva Password</label>
                          <input type={showPassword ? "text" : "password"} required className="mt-1 w-full p-2.5 pr-10 border border-[#cfd7e7] dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-sm focus:border-[#135bec] outline-none"
                              value={adminPassword} onChange={e => setAdminPassword(e.target.value)} placeholder="Nueva password" />
                          <button type="button" className="absolute right-2 top-8 text-slate-400 hover:text-slate-600" onClick={() => setShowPassword(!showPassword)}>
                              {showPassword ? <EyeSlashIcon className="w-[18px] h-[18px]" /> : <EyeIcon className="w-[18px] h-[18px]" />}
                          </button>
                      </div>
                      <div className="flex gap-2 pt-2">
                          <button type="button" onClick={() => { setShowResetAdminModal(false); setAdminPassword(''); setSelectedAdminUser(null); }} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-[#4c669a] hover:bg-slate-100 dark:hover:bg-slate-800">Cancelar</button>
                          <button type="submit" className="flex-1 py-2.5 bg-[#135bec] text-white rounded-lg text-sm font-medium hover:opacity-90">Resetear</button>
                      </div>
                  </form>
              </div>
          </div>
        )}

        {/* MODAL EDITAR USUARIO */}
        {showEditUserModal && selectedUserToEdit && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
              <div className="bg-white dark:bg-slate-900 rounded-xl p-5 w-full max-w-md shadow-xl">
                  <h3 className="text-lg font-bold text-[#0d121b] dark:text-white mb-1">Editar Usuario</h3>
                  <p className="text-xs text-[#4c669a] dark:text-slate-400 mb-4">{selectedUserToEdit.email}</p>
                  <form onSubmit={confirmEditUser} className="space-y-3">
                      <div>
                          <label className="text-xs font-semibold text-[#4c669a] dark:text-slate-400">Nombre</label>
                          <input type="text" className="mt-1 w-full p-2.5 border border-[#cfd7e7] dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-sm focus:border-purple-500 outline-none"
                              value={editUserForm.name} onChange={e => setEditUserForm({ ...editUserForm, name: e.target.value })} />
                      </div>
                      <div>
                          <label className="text-xs font-semibold text-[#4c669a] dark:text-slate-400">Rol</label>
                          <select className="mt-1 w-full p-2.5 border border-[#cfd7e7] dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg text-sm focus:border-purple-500 outline-none"
                              value={editUserForm.role} onChange={e => setEditUserForm({ ...editUserForm, role: e.target.value })}>
                              <option value="ADMIN">Admin</option>
                              <option value="VENDEDOR">Vendedor</option>
                              <option value="CONTADOR">Contador</option>
                          </select>
                      </div>
                      <div className="flex gap-2 pt-2">
                          <button type="button" onClick={() => { setShowEditUserModal(false); setSelectedUserToEdit(null); }} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-[#4c669a] hover:bg-slate-100 dark:hover:bg-slate-800">Cancelar</button>
                          <button type="submit" className="flex-1 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:opacity-90">Guardar</button>
                      </div>
                  </form>
              </div>
          </div>
        )}

        {/* MODAL SUSCRIPCIONES */}
        {showSubscriptionModal && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg p-6">
          <h3 className="text-xl font-bold mb-4">
            {editingSubscription ? 'Editar Plan' : 'Nuevo Plan de Suscripción'}
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Código</label>
              <input
                type="text"
                value={subscriptionForm.code}
                onChange={(e) => setSubscriptionForm({...subscriptionForm, code: e.target.value})}
                className="w-full p-2 border rounded-lg dark:bg-slate-800"
                placeholder="Ej: PRO, ENTERPRISE"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Nombre</label>
              <input
                type="text"
                value={subscriptionForm.name}
                onChange={(e) => setSubscriptionForm({...subscriptionForm, name: e.target.value})}
                className="w-full p-2 border rounded-lg dark:bg-slate-800"
                placeholder="Ej: Plan Profesional"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Descripción</label>
              <textarea
                value={subscriptionForm.description}
                onChange={(e) => setSubscriptionForm({...subscriptionForm, description: e.target.value})}
                className="w-full p-2 border rounded-lg dark:bg-slate-800"
                rows={2}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Precio ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={subscriptionForm.price}
                  onChange={(e) => setSubscriptionForm({...subscriptionForm, price: Number(e.target.value)})}
                  className="w-full p-2 border rounded-lg dark:bg-slate-800"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Período</label>
                <select
                  value={subscriptionForm.period}
                  onChange={(e) => setSubscriptionForm({...subscriptionForm, period: e.target.value as any})}
                  className="w-full p-2 border rounded-lg dark:bg-slate-800"
                >
                  <option value="mensual">Mensual</option>
                  <option value="bimestral">Bimestral</option>
                  <option value="trimestral">Trimestral</option>
                  <option value="semestral">Semestral</option>
                  <option value="anual">Anual</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Duración (días)</label>
              <input
                type="number"
                value={subscriptionForm.durationDays}
                onChange={(e) => setSubscriptionForm({...subscriptionForm, durationDays: Number(e.target.value)})}
                className="w-full p-2 border rounded-lg dark:bg-slate-800"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Características (separadas por coma)</label>
              <textarea
                value={subscriptionForm.features}
                onChange={(e) => setSubscriptionForm({...subscriptionForm, features: e.target.value})}
                className="w-full p-2 border rounded-lg dark:bg-slate-800"
                rows={2}
                placeholder="Ej: 5 empresas, Facturas ilimitadas"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={subscriptionForm.isActive}
                onChange={(e) => setSubscriptionForm({...subscriptionForm, isActive: e.target.checked})}
                className="w-4 h-4"
              />
              <label htmlFor="isActive" className="text-sm">Plan activo</label>
            </div>
          </div>
          
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setShowSubscriptionModal(false)}
              className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                if (!subscriptionForm.code || !subscriptionForm.name) {
                  onNotify('Código y nombre son obligatorios', 'error');
                  return;
                }
                
                const featuresArray = subscriptionForm.features.split(',').map(f => f.trim()).filter(f => f);
                
                if (editingSubscription) {
                  setSaasSubscriptions(saasSubscriptions.map(s => 
                    s.id === editingSubscription.id 
                      ? { ...s, ...subscriptionForm, features: featuresArray }
                      : s
                  ));
                  onNotify('Plan actualizado');
                } else {
                  const newSub: SaasSubscription = {
                    id: Math.random().toString(),
                    ...subscriptionForm,
                    features: featuresArray
                  };
                  setSaasSubscriptions([...saasSubscriptions, newSub]);
                  onNotify('Plan creado correctamente');
                }
                setShowSubscriptionModal(false);
              }}
              className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors"
            >
              {editingSubscription ? 'Actualizar' : 'Crear Plan'}
            </button>
          </div>
        </div>
      </div>
        )}
      
      {/* Configuración de Pagos */}
      {activeTab === 'config' && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-[#cfd7e7] dark:border-slate-800 overflow-hidden shadow-sm p-6 md:p-8">
            <h2 className="text-[#0d121b] dark:text-white text-lg font-bold mb-6">Configuración de Métodos de Pago</h2>
            
            {loadingConfig ? (
              <p className="text-slate-400">Cargando...</p>
            ) : (
              <div className="space-y-6">
                {/* Toggles */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <label className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${paymentConfig.paypalEnabled ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' : 'border-slate-200 dark:border-slate-700'}`}>
                    <input type="checkbox" checked={paymentConfig.paypalEnabled} onChange={e => setPaymentConfig({...paymentConfig, paypalEnabled: e.target.checked})} className="sr-only" />
                    <span className="text-sm font-bold">PayPal</span>
                  </label>
                  <label className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${paymentConfig.transferEnabled ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' : 'border-slate-200 dark:border-slate-700'}`}>
                    <input type="checkbox" checked={paymentConfig.transferEnabled} onChange={e => setPaymentConfig({...paymentConfig, transferEnabled: e.target.checked})} className="sr-only" />
                    <span className="text-sm font-bold">Transferencia</span>
                  </label>
                  <label className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${paymentConfig.cardEnabled ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' : 'border-slate-200 dark:border-slate-700'}`}>
                    <input type="checkbox" checked={paymentConfig.cardEnabled} onChange={e => setPaymentConfig({...paymentConfig, cardEnabled: e.target.checked})} className="sr-only" />
                    <span className="text-sm font-bold">Tarjeta</span>
                  </label>
                </div>

                {/* Datos bancarios */}
                <div className="border-t border-slate-100 dark:border-slate-700 pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm uppercase tracking-wider">Cuentas Bancarias</h3>
                    <button onClick={() => {
                      setPaymentConfig({
                        ...paymentConfig,
                        bankAccounts: [
                          ...paymentConfig.bankAccounts,
                          {
                            id: Math.random().toString(36).substring(7),
                            bankName: '',
                            bankAccount: '',
                            bankAccountType: 'Cuenta Corriente',
                            bankHolderName: '',
                            bankHolderRuc: ''
                          }
                        ]
                      });
                    }} className="flex items-center gap-1 text-xs bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-200 transition-colors">
                      <PlusIcon className="w-4 h-4" /> Agregar Cuenta
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {paymentConfig.bankAccounts.length === 0 && (
                      <p className="text-sm text-slate-500 text-center py-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">No hay cuentas bancarias configuradas.</p>
                    )}
                    {paymentConfig.bankAccounts.map((acc, index) => (
                      <div key={acc.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl relative bg-slate-50 dark:bg-slate-800/30">
                        <div className="absolute top-4 right-4">
                          <button onClick={() => {
                            setPaymentConfig({
                              ...paymentConfig,
                              bankAccounts: paymentConfig.bankAccounts.filter(a => a.id !== acc.id)
                            });
                          }} className="text-red-500 hover:text-red-700 p-1 bg-red-50 hover:bg-red-100 rounded-lg transition-colors" title="Eliminar cuenta">
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                        <h4 className="text-xs font-bold text-indigo-600 mb-3">Cuenta #{index + 1}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Banco</label>
                            <input type="text" value={acc.bankName} onChange={e => {
                              const newAccounts = [...paymentConfig.bankAccounts];
                              newAccounts[index].bankName = e.target.value;
                              setPaymentConfig({...paymentConfig, bankAccounts: newAccounts});
                            }} className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-sm outline-none focus:border-indigo-500" placeholder="Ej: Banco Pichincha" />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">N° de Cuenta</label>
                            <input type="text" value={acc.bankAccount} onChange={e => {
                              const newAccounts = [...paymentConfig.bankAccounts];
                              newAccounts[index].bankAccount = e.target.value;
                              setPaymentConfig({...paymentConfig, bankAccounts: newAccounts});
                            }} className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-sm outline-none focus:border-indigo-500" placeholder="Ej: 1234567890" />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Tipo de Cuenta</label>
                            <select value={acc.bankAccountType} onChange={e => {
                              const newAccounts = [...paymentConfig.bankAccounts];
                              newAccounts[index].bankAccountType = e.target.value;
                              setPaymentConfig({...paymentConfig, bankAccounts: newAccounts});
                            }} className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-sm outline-none focus:border-indigo-500">
                              <option>Cuenta Corriente</option>
                              <option>Cuenta de Ahorros</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Titular</label>
                            <input type="text" value={acc.bankHolderName} onChange={e => {
                              const newAccounts = [...paymentConfig.bankAccounts];
                              newAccounts[index].bankHolderName = e.target.value;
                              setPaymentConfig({...paymentConfig, bankAccounts: newAccounts});
                            }} className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-sm outline-none focus:border-indigo-500" placeholder="Ej: ECUAFACT S.A." />
                          </div>
                          <div className="md:col-span-2">
                            <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">RUC del Titular</label>
                            <input type="text" value={acc.bankHolderRuc} onChange={e => {
                              const newAccounts = [...paymentConfig.bankAccounts];
                              newAccounts[index].bankHolderRuc = e.target.value;
                              setPaymentConfig({...paymentConfig, bankAccounts: newAccounts});
                            }} className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-sm outline-none focus:border-indigo-500" placeholder="Ej: 0953443769" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
                  <button onClick={savePaymentConfig} disabled={savingConfig} className="w-full py-3 bg-indigo-700 text-white font-bold rounded-xl hover:bg-indigo-800 transition-colors disabled:opacity-50">
                    {savingConfig ? 'Guardando...' : 'Guardar Configuración'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </>
  );
};

export default SaasAdmin;
