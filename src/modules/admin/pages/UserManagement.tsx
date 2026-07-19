import React, { useState, useEffect, useId } from 'react';
import {
  UserIcon,
  ShieldCheckIcon,
  BriefcaseIcon,
  ShoppingCartIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ClockIcon,
  InboxIcon,
  TrashIcon,
  PencilIcon,
  KeyIcon,
  PauseCircleIcon,
  PlayCircleIcon,
  XMarkIcon,
  EyeIcon,
  EyeSlashIcon,
  ExclamationTriangleIcon,
  QuestionMarkCircleIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import ModulePermissionModal from '../components/ModulePermissionModal';

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

interface User {
  id: string;
  email: string;
  role: string;
  name?: string;
  isActive?: boolean;
  businessId?: string | null;
  business?: {
    id: string;
    name: string;
    ruc: string;
    plan?: string;
    isActive?: boolean;
    subscriptionEnd?: string | null;
  } | null;
}

interface Business {
  id: string;
  name: string;
  ruc: string;
  isActive?: boolean;
  plan?: string;
}

interface UserManagementProps {
  currentUser: any;
  onNotify: (text: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

// Constante y helper puros: se definen a nivel de módulo para no recrearlos
// en cada render y no romper la memoización de los componentes hijos.
const roleLabels: Record<string, { label: string; color: string }> = {
  '': { label: 'Sin rol', color: 'slate' },
  SUPERADMIN: { label: 'Super Admin', color: 'red' },
  ADMIN: { label: 'Admin Empresa', color: 'blue' },
  VENDEDOR: { label: 'Vendedor', color: 'emerald' },
  CONTADOR: { label: 'Contador', color: 'purple' }
};

const getRoleIcon = (role: string) => {
  switch (role) {
    case 'SUPERADMIN': return <ShieldCheckIcon className="w-5 h-5" />;
    case 'ADMIN': return <BriefcaseIcon className="w-5 h-5" />;
    case 'VENDEDOR': return <ShoppingCartIcon className="w-5 h-5" />;
    case 'CONTADOR': return <ChartBarIcon className="w-5 h-5" />;
    default: return <QuestionMarkCircleIcon className="w-5 h-5" />;
  }
};

const UserManagement: React.FC<UserManagementProps> = ({ currentUser, onNotify }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('ALL');
  const [showModal, setShowModal] = useState(false);
  const fieldId = useId();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [tempPassword, setTempPassword] = useState('');
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [moduleUser, setModuleUser] = useState<User | null>(null);
  const [hasModuleControl, setHasModuleControl] = useState(() => {
    return JSON.parse(localStorage.getItem('hasModuleControl') || 'false');
  });

  const isSuperAdmin = currentUser?.role === 'SUPERADMIN';
  const isAdmin = currentUser?.role === 'ADMIN';

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    role: isSuperAdmin ? 'ADMIN' : 'ADMIN',
    businessId: ''
  });

  const [editFormData, setEditFormData] = useState({
    email: '',
    name: '',
    role: 'ADMIN',
    businessId: ''
  });

  // Cargar datos según el rol
  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) return;

      if (isSuperAdmin) {
        // SUPERADMIN: Cargar todos los usuarios y empresas
        const [usersRes, businessesRes] = await Promise.all([
          fetch(`${API_URL}/api/admin/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${API_URL}/api/admin/businesses`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        if (usersRes.ok) {
          const data = await usersRes.json();
          setUsers(data);
        }
        if (businessesRes.ok) {
          setBusinesses(await businessesRes.json());
        }
      } else if (isAdmin) {
        // ADMIN: Cargar solo usuarios de su empresa
        const response = await fetch(`${API_URL}/api/business/users`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setUsers(data);
        }
      }
    } catch (error) {
      console.error('Error cargando administradores:', error);
      onNotify('Error al cargar administradores', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtrar usuarios
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.business?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'ALL' || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  // Roles disponibles según el tipo de usuario
  const availableRoles = isSuperAdmin
    ? ['SUPERADMIN', 'ADMIN']
    : ['ADMIN', 'VENDEDOR', 'CONTADOR'];


  // Crear usuario
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      onNotify('Email y contraseña son obligatorios', 'warning');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      onNotify('Las contraseñas no coinciden', 'error');
      return;
    }

    if (formData.password.length < 6) {
      onNotify('La contraseña debe tener al menos 6 caracteres', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      let url: string;
      let body: any;

      if (isSuperAdmin) {
        url = `${API_URL}/api/admin/users`;
        body = {
          email: formData.email,
          password: formData.password,
          role: formData.role,
          businessId: formData.role === 'SUPERADMIN' ? undefined : formData.businessId || undefined
        };
      } else {
        url = `${API_URL}/api/business/users`;
        body = {
          email: formData.email,
          password: formData.password,
          role: formData.role,
          name: formData.name
        };
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        onNotify('Usuario creado exitosamente', 'success');
        setShowModal(false);
        setFormData({ email: '', password: '', confirmPassword: '', name: '', role: isSuperAdmin ? 'ADMIN' : 'ADMIN', businessId: '' });
        loadData();
        // Si el plan permite control de módulos y es un empleado, abrir el modal
        // para elegir de inmediato a qué módulos accede (sobre su default de rol).
        if (!isSuperAdmin && hasModuleControl && data.user &&
            (data.user.role === 'VENDEDOR' || data.user.role === 'CONTADOR')) {
          setModuleUser(data.user);
          setShowModuleModal(true);
        }
      } else {
        onNotify(data.message || 'Error al crear usuario', 'error');
      }
    } catch (error) {
      console.error(error);
      onNotify('Error de conexión', 'error');
    }
  };

  // Eliminar administrador
  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      const token = localStorage.getItem('adminToken');
      const url = isSuperAdmin
        ? `${API_URL}/api/admin/users/${selectedUser.id}`
        : `${API_URL}/api/business/users/${selectedUser.id}`;

      const response = await fetch(url, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        onNotify('Administrador eliminado correctamente', 'success');
        setShowDeleteModal(false);
        setSelectedUser(null);
        loadData();
      } else {
        const data = await response.json();
        onNotify(data.message || 'Error al eliminar', 'error');
      }
    } catch (error) {
      onNotify('Error de conexión', 'error');
    }
  };

  // Reset password
  const handleResetPassword = async () => {
    if (!selectedUser || !tempPassword) return;

    try {
      const token = localStorage.getItem('adminToken');
      const url = isSuperAdmin
        ? `${API_URL}/api/admin/users/${selectedUser.id}/reset-password`
        : `${API_URL}/api/business/users/${selectedUser.id}/reset-password`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ temporaryPassword: tempPassword })
      });

      const data = await response.json();
      if (data.success) {
        onNotify('Contraseña restablecida correctamente', 'success');
        setShowResetModal(false);
        setTempPassword('');
        setSelectedUser(null);
      } else {
        onNotify(data.message || 'Error al restablecer', 'error');
      }
    } catch (error) {
      onNotify('Error de conexión', 'error');
    }
  };

  // Editar usuario (para SUPERADMIN y ADMIN de empresa)
  const handleEditUser = async () => {
    if (!editingUser) return;

    try {
      const token = localStorage.getItem('adminToken');
      const isSuperAdmin = localStorage.getItem('role') === 'SUPERADMIN';
      
      // Usar endpoint de admin para SUPERADMIN, o endpoint de business para ADMIN de empresa
      const endpoint = isSuperAdmin 
        ? `${API_URL}/api/admin/users/${editingUser.id}`
        : `${API_URL}/api/business/users/${editingUser.id}`;
      
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editFormData.name,
          role: editFormData.role
        })
      });

      const data = await response.json();
      if (response.ok || data.success) {
        onNotify('Usuario actualizado correctamente', 'success');
        setShowEditModal(false);
        setEditingUser(null);
        loadData();
      } else {
        onNotify(data.message || 'Error al actualizar', 'error');
      }
    } catch (error) {
      onNotify('Error de conexión', 'error');
    }
  };

  // Abrir modal de edición
  const openEditModal = (user: User) => {
    setEditingUser(user);
    setEditFormData({
      email: user.email,
      name: user.name || '',
      role: user.role,
      businessId: user.businessId || ''
    });
    setShowEditModal(true);
  };

  // Toggle estado de usuario (solo para ADMIN de empresa)
  const handleToggleStatus = async (user: User) => {
    if (!isAdmin) return;

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/api/business/users/${user.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: !user.isActive })
      });

      if (response.ok) {
        onNotify(`Usuario ${!user.isActive ? 'activado' : 'desactivado'}`, 'success');
        loadData();
      }
    } catch (error) {
      onNotify('Error al cambiar estado', 'error');
    }
  };

  // Obtener roles únicos para el filtro
  const uniqueRoles: string[] = Array.from(new Set(users.map(u => String(u.role))));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm dark:shadow-lg dark:shadow-black/10 border border-slate-100 dark:border-slate-700/50">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter flex items-center gap-3">
              <BriefcaseIcon className="w-8 h-8" />
              {isSuperAdmin ? 'Gestión Global de Administradores' : 'Administradores de la Empresa'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {isSuperAdmin
                ? 'Administra los superadmins y administradores de empresas del sistema'
                : 'Gestiona los administradores de tu empresa. Los clientes se gestionan en "Entidades"'}
            </p>
          </div>
          <button type="button"
            onClick={() => setShowModal(true)}
            className="px-6 py-3 bg-sky-500 text-white rounded-2xl font-bold text-sm hover:bg-sky-600 transition-all shadow-lg shadow-sky-500/20 flex items-center gap-2"
          >
            <PlusIcon className="w-4 h-4" /> Nuevo Administrador
          </button>
        </div>

        {/* Filtros */}
        <div className="mt-6 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por email, nombre o empresa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 dark:text-white border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button type="button"
              onClick={() => setFilterRole('ALL')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                filterRole === 'ALL'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Todos ({users.length})
            </button>
            {uniqueRoles.map(role => {
              const info = roleLabels[role as keyof typeof roleLabels] || { label: role, color: 'slate' };
              const count = users.filter(u => u.role === role).length;
              return (
                <button type="button"
                  key={role}
                  onClick={() => setFilterRole(role)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                    filterRole === role
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {getRoleIcon(role)} {info.label} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tabla de Usuarios */}
      <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm dark:shadow-lg dark:shadow-black/10 border border-slate-100 dark:border-slate-700/50 overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-400 dark:text-slate-500">
            <ClockIcon className="w-12 h-12 mb-4 animate-pulse mx-auto" />
            <p className="font-bold">Cargando administradores...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-16 text-center text-slate-400 dark:text-slate-500">
            <InboxIcon className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p className="font-bold">No se encontraron administradores</p>
            <p className="text-xs mt-2">Intenta con otro término de búsqueda o crea un nuevo administrador</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700/50">
                  <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Administrador</th>
                  <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Rol</th>
                  {isSuperAdmin && (
                    <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Empresa</th>
                  )}
                  <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Estado</th>
                  <th className="text-right px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {filteredUsers.map((user) => {
                  const roleInfo = roleLabels[user.role] || { label: user.role, color: 'slate' };
                  const isCurrentUser = user.id === currentUser?.id;
                  
                  return (
                    <tr key={user.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${isCurrentUser ? 'bg-sky-50/30 dark:bg-sky-500/5' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${roleInfo.color}-100 dark:bg-${roleInfo.color}-500/10`}>
                            {getRoleIcon(user.role)}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-slate-800 dark:text-white">
                              {user.name || user.email}
                              {isCurrentUser && <span className="ml-2 text-[9px] bg-sky-100 dark:bg-sky-500/20 text-sky-500 dark:text-sky-400 px-2 py-0.5 rounded-full font-black">TÚ</span>}
                            </p>
                            {user.name && <p className="text-xs text-slate-400 dark:text-slate-500">{user.email}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-${roleInfo.color}-50 dark:bg-${roleInfo.color}-500/10 text-${roleInfo.color}-600 dark:text-${roleInfo.color}-400`}>
                          {getRoleIcon(user.role)} {roleInfo.label}
                        </span>
                      </td>
                      {isSuperAdmin && (
                        <td className="px-6 py-4">
                          {user.business ? (
                            <div>
                              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{user.business.name}</p>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500">RUC: {user.business.ruc}</p>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 dark:text-slate-500 italic">Sin empresa (Global)</span>
                          )}
                        </td>
                      )}
                      <td className="px-6 py-4">
                        {user.isActive !== undefined ? (
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black ${
                            user.isActive
                              ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                            {user.isActive ? 'ACTIVO' : 'INACTIVO'}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {/* Reset Password */}
                          <button type="button"
                            onClick={() => { setSelectedUser(user); setShowResetModal(true); }}
                            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                            title="Restablecer contraseña"
                          >
                            <KeyIcon className="w-4 h-4" />
                          </button>
                          
                          {/* Toggle Status (solo ADMIN de empresa) */}
                          {isAdmin && !isCurrentUser && user.isActive !== undefined && (
                            <button type="button"
                              onClick={() => handleToggleStatus(user)}
                              className={`p-2 rounded-lg transition-colors ${
                                user.isActive
                                  ? 'hover:bg-amber-50 dark:hover:bg-amber-500/10 text-amber-500'
                                  : 'hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-emerald-500'
                              }`}
                              title={user.isActive ? 'Desactivar' : 'Activar'}
                            >
                              {user.isActive ? <PauseCircleIcon className="w-4 h-4" /> : <PlayCircleIcon className="w-4 h-4" />}
                            </button>
                          )}

                          {/* Delete */}
                          {!isCurrentUser && (
                            <button type="button"
                              onClick={() => { setSelectedUser(user); setShowDeleteModal(true); }}
                              className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-colors"
                              title="Eliminar administrador"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}

                          {/* Edit - para SUPERADMIN y ADMIN de empresa */}
                          {(isSuperAdmin || isAdmin) && !isCurrentUser && (
                            <button type="button"
                              onClick={() => openEditModal(user)}
                              className="p-2 rounded-lg hover:bg-sky-50 dark:hover:bg-sky-500/10 text-slate-400 hover:text-sky-500 transition-colors"
                              title="Editar administrador"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                          )}

                          {/* Gestionar Módulos - solo ADMIN de empresa con hasModuleControl */}
                          {isAdmin && hasModuleControl && user.role !== 'ADMIN' && !isCurrentUser && (
                            <button type="button"
                              onClick={() => { setModuleUser(user); setShowModuleModal(true); }}
                              className="p-2 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-500/10 text-slate-400 hover:text-purple-500 transition-colors"
                              title="Gestionar módulos del usuario"
                            >
                              <Cog6ToothIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {uniqueRoles.map(role => {
          const info = roleLabels[role as keyof typeof roleLabels] || { label: role, color: 'slate' };
          const count = users.filter(u => u.role === role).length;
          return (
            <div key={role} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                {getRoleIcon(role)}
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{info.label}</span>
              </div>
              <p className="text-2xl font-black text-slate-800 dark:text-white">{count}</p>
            </div>
          );
        })}
      </div>

      {/* ============ MODAL: CREAR USUARIO ============ */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl dark:shadow-black/40 w-full max-w-lg border border-slate-200 dark:border-slate-700/50 animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700/50">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <PlusIcon className="w-5 h-5" /> Nuevo Administrador
                </h3>
                <button type="button" aria-label="Cerrar" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white"><XMarkIcon className="w-5 h-5" /></button>
              </div>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div className="space-y-2">
                <label htmlFor={`${fieldId}-create-email`} className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Email</label>
                <input
                  id={`${fieldId}-create-email`}
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 dark:text-white rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="usuario@email.com"
                />
              </div>

              {!isSuperAdmin && (
                <div className="space-y-2">
                  <label htmlFor={`${fieldId}-create-name`} className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Nombre (Opcional)</label>
                  <input
                    id={`${fieldId}-create-name`}
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 dark:text-white rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nombre del usuario"
                  />
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor={`${fieldId}-create-role`} className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Rol</label>
                <select
                  id={`${fieldId}-create-role`}
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 dark:text-white rounded-xl text-sm font-bold border border-slate-200 dark:border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {availableRoles.map(role => {
                    const info = roleLabels[role] || { label: role };
                    return (
                      <option key={role} value={role}>{info.label}</option>
                    );
                  })}
                </select>
              </div>

              {/* Selector de empresa (solo SUPERADMIN y solo para roles no-SUPERADMIN) */}
              {isSuperAdmin && formData.role !== 'SUPERADMIN' && (
                <div className="space-y-2">
                  <label htmlFor={`${fieldId}-create-business`} className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Empresa</label>
                  <select
                    id={`${fieldId}-create-business`}
                    value={formData.businessId}
                    onChange={(e) => setFormData({ ...formData, businessId: e.target.value })}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 dark:text-white rounded-xl text-sm font-bold border border-slate-200 dark:border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Seleccionar empresa...</option>
                    {businesses.map(b => (
                      <option key={b.id} value={b.id}>{b.name} ({b.ruc})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor={`${fieldId}-create-password`} className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Contraseña</label>
                  <div className="relative">
                    <input
                      id={`${fieldId}-create-password`}
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 dark:text-white rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                      placeholder="••••••"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                      {showPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor={`${fieldId}-create-confirm`} className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Confirmar</label>
                  <input
                    id={`${fieldId}-create-confirm`}
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 dark:text-white rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-sky-500 text-white rounded-xl font-bold text-sm hover:bg-sky-600 transition-colors shadow-lg shadow-sky-500/20"
                >
                  Crear Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============ MODAL: CONFIRMAR ELIMINACIÓN ============ */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl dark:shadow-black/40 w-full max-w-md border border-slate-200 dark:border-slate-700/50 p-8 text-center animate-in zoom-in-95 duration-300">
            <ExclamationTriangleIcon className="w-14 h-14 mx-auto mb-4 text-amber-500" />
            <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">¿Eliminar administrador?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Se eliminará permanentemente a <strong className="text-slate-800 dark:text-white">{selectedUser.email}</strong>. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button type="button"
                onClick={() => { setShowDeleteModal(false); setSelectedUser(null); }}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button type="button"
                onClick={handleDeleteUser}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ MODAL: RESET PASSWORD ============ */}
      {showResetModal && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl dark:shadow-black/40 w-full max-w-md border border-slate-200 dark:border-slate-700/50 p-8 animate-in zoom-in-95 duration-300">
            <h3 className="text-lg font-black text-slate-800 dark:text-white mb-2 flex items-center gap-2">
              <KeyIcon className="w-5 h-5" /> Restablecer Contraseña
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Nueva contraseña temporal para <strong className="text-slate-800 dark:text-white">{selectedUser.email}</strong>
            </p>
            <input
              type="text"
              value={tempPassword}
              onChange={(e) => setTempPassword(e.target.value)}
              className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 dark:text-white rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-6"
              placeholder="Contraseña temporal..."
            />
            <div className="flex gap-3">
              <button type="button"
                onClick={() => { setShowResetModal(false); setTempPassword(''); setSelectedUser(null); }}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button type="button"
                onClick={handleResetPassword}
                disabled={!tempPassword}
                className="flex-1 py-3 bg-sky-500 text-white rounded-xl font-bold text-sm hover:bg-sky-600 transition-colors shadow-lg shadow-sky-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Restablecer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ MODAL: EDITAR USUARIO ============ */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl dark:shadow-black/40 w-full max-w-lg border border-slate-200 dark:border-slate-700/50 animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700/50">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <PencilIcon className="w-5 h-5" /> Editar Administrador
                </h3>
                <button type="button" aria-label="Cerrar" onClick={() => { setShowEditModal(false); setEditingUser(null); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-white"><XMarkIcon className="w-5 h-5" /></button>
              </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleEditUser(); }} className="p-6 space-y-4">
              <div className="space-y-2">
                <label htmlFor={`${fieldId}-edit-email`} className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Email</label>
                <input
                  id={`${fieldId}-edit-email`}
                  type="email"
                  required
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 dark:text-white rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor={`${fieldId}-edit-name`} className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Nombre</label>
                <input
                  id={`${fieldId}-edit-name`}
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 dark:text-white rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nombre del administrador..."
                />
              </div>

              <div className="space-y-2">
                <label htmlFor={`${fieldId}-edit-role`} className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Rol</label>
                <select
                  id={`${fieldId}-edit-role`}
                  value={editFormData.role}
                  onChange={(e) => setEditFormData({...editFormData, role: e.target.value})}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 dark:text-white rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="SUPERADMIN">Superadmin</option>
                  <option value="ADMIN">Admin de Empresa</option>
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor={`${fieldId}-edit-business`} className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Empresa</label>
                <select
                  id={`${fieldId}-edit-business`}
                  value={editFormData.businessId}
                  onChange={(e) => setEditFormData({...editFormData, businessId: e.target.value})}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 dark:text-white rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sin empresa (Global)</option>
                  {businesses.map(biz => (
                    <option key={biz.id} value={biz.id}>{biz.name} - {biz.ruc}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setEditingUser(null); }}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button aria-label="Acción"
                  type="submit"
                  className="flex-1 py-3 bg-sky-500 text-white rounded-xl font-bold text-sm hover:bg-sky-600 transition-colors shadow-lg shadow-sky-500/20"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ============ MODAL: GESTIONAR MÓDULOS ============ */}
      {showModuleModal && moduleUser && (
        <ModulePermissionModal
          userId={moduleUser.id}
          userName={moduleUser.name || ''}
          userEmail={moduleUser.email}
          onClose={() => { setShowModuleModal(false); setModuleUser(null); }}
          onNotify={onNotify}
          onSaved={() => loadData()}
        />
      )}
    </div>
  );
};

export default UserManagement;
