import React, { useState, useEffect } from 'react';
import {
  UserIcon,
  UsersIcon,
  MagnifyingGlassIcon,
  EnvelopeIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  XCircleIcon,
  BoltIcon,
  PauseCircleIcon,
  PlayCircleIcon,
  KeyIcon,
  PencilIcon,
  TrashIcon,
  ChartBarIcon,
  PlusIcon,
  HandRaisedIcon,
  EyeIcon,
  EyeSlashIcon,
  ExclamationTriangleIcon,
  BriefcaseIcon,
} from '@heroicons/react/24/outline';

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

interface User {
  id: string;
  email: string;
  role: string;
  name?: string;
  isActive: boolean;
  createdAt?: string;
}

interface CompanyUsersProps {
  onNotify: (text: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  businessId: string;
}

const CompanyUsers: React.FC<CompanyUsersProps> = ({ onNotify, businessId }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [tempPassword, setTempPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'ADMIN'
  });

  // Cargar usuarios de la empresa
  const loadUsers = async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/api/business/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Error al cargar usuarios');
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error(error);
      onNotify('Error al cargar usuarios', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [businessId]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      onNotify('Email y contraseña son obligatorios', 'warning');
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/api/business/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ...formData, businessId })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Error al crear usuario');

      onNotify('Usuario creado exitosamente', 'success');
      setShowModal(false);
      setFormData({ email: '', password: '', name: '', role: 'ADMIN' });
      loadUsers();
    } catch (error: any) {
      onNotify(error.message, 'error');
    }
  };

  const handleDeleteUser = (user: User) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/api/business/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Error al eliminar');
      }

      setUsers(users.filter(u => u.id !== userToDelete.id));
      if (selectedUser?.id === userToDelete.id) setSelectedUser(null);
      onNotify('Usuario eliminado', 'success');
    } catch (error: any) {
      onNotify(error.message, 'error');
    } finally {
      setShowDeleteModal(false);
      setUserToDelete(null);
    }
  };

  const handleToggleStatus = async (user: User) => {
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

      const data = await response.json();
      if (!response.ok) {
         throw new Error(data.message || 'Error al actualizar estado');
      }

      const updatedUser = data.user;
      setUsers(users.map(u => u.id === user.id ? updatedUser : u));
      if (selectedUser?.id === user.id) setSelectedUser(updatedUser);
       
      onNotify(`Usuario ${!user.isActive ? 'activado' : 'desactivado'}`, 'success');
    } catch (error: any) {
      onNotify(error.message, 'error');
    }
  };

  const handleResetPassword = () => {
    if (!selectedUser) return;
    setTempPassword('');
    setShowResetModal(true);
  };

  const handleEditUser = () => {
    if (!selectedUser) return;
    setFormData({
      email: selectedUser.email,
      password: '',
      name: selectedUser.name || '',
      role: selectedUser.role
    });
    setShowEditModal(true);
  };

  const confirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !tempPassword) return;

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/api/business/users/${selectedUser.id}/reset-password`, {
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
        setShowResetModal(false);
      } else {
        onNotify(data.message || 'Error al resetear', 'error');
      }
    } catch (error) { onNotify('Error de conexión', 'error'); }
  };

  const confirmEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      const token = localStorage.getItem('adminToken');
      const updateData: any = {
        name: formData.name,
        role: formData.role
      };
      
      // Solo actualizar contraseña si se proporcionó una nueva
      if (formData.password) {
        updateData.password = formData.password;
      }

      const response = await fetch(`${API_URL}/api/business/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Error al actualizar usuario');

      // Actualizar selectedUser si es el mismo que se editó
      if (selectedUser && selectedUser.id === data.user.id) {
        setSelectedUser(data.user);
      }

      onNotify('Usuario actualizado exitosamente', 'success');
      setShowEditModal(false);
      setFormData({ email: '', password: '', name: '', role: 'ADMIN' });
      loadUsers();
    } catch (error: any) {
      onNotify(error.message, 'error');
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Función para obtener el color del rol
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'VENDEDOR': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'CONTADOR': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // Función para obtener el icono del rol
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ADMIN': return <UserIcon className="w-4 h-4" />;
      case 'VENDEDOR': return <BriefcaseIcon className="w-4 h-4" />;
      case 'CONTADOR': return <ChartBarIcon className="w-4 h-4" />;
      default: return <UserIcon className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex h-[calc(100vh-100px)] gap-6 animate-in fade-in duration-500">
      {/* PANEL IZQUIERDO: LISTA DE USUARIOS */}
      <div className="w-1/3 bg-white rounded-[2rem] shadow-xl border border-slate-100 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <UsersIcon className="w-6 h-6" /> Equipo de Trabajo
            </h2>
            <button 
              onClick={() => setShowModal(true)}
              className="bg-indigo-700 text-white w-8 h-8 rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
              title="Nuevo Usuario"
            >
              <PlusIcon className="w-4 h-4" />
            </button>
          </div>
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar usuario..." 
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {loading ? (
            <div className="text-center p-10 text-slate-400">Cargando...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center p-10 text-slate-400">No se encontraron usuarios</div>
          ) : (
            filteredUsers.map(user => (
              <div 
                key={user.id}
                onClick={() => setSelectedUser(user)}
                className={`p-4 rounded-2xl cursor-pointer border-2 transition-all hover:shadow-md ${
                  selectedUser?.id === user.id 
                    ? 'border-indigo-500 bg-indigo-50/50' 
                    : 'border-transparent bg-slate-50 hover:bg-white hover:border-slate-200'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-slate-800 line-clamp-1">{user.name || user.email}</h3>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    user.isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                  }`}>
                    {user.isActive ? 'ACTIVO' : 'INACTIVO'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mb-2 line-clamp-1">{user.email}</p>
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-white/50 px-2 py-1 rounded-lg w-fit">
                  <span>{getRoleIcon(user.role)}</span>
                  <span className={getRoleColor(user.role).split(' ')[1]}>{user.role}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* PANEL DERECHO: DETALLES DEL USUARIO */}
      <div className="w-2/3 h-full overflow-y-auto custom-scrollbar pr-2">
        {selectedUser ? (
          <div className="flex flex-col gap-6 pb-10">
            {/* Tarjeta de Estado del Usuario */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
              
              <div className="relative z-10 flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-black text-slate-800 mb-2">{selectedUser.name || 'Sin nombre'}</h1>
                  <div className="flex flex-col gap-3 mt-2">
                    <div className="flex gap-2">
                      <span className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-500">                      <EnvelopeIcon className="w-4 h-4 inline" /> {selectedUser.email}</span>
                      <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${getRoleColor(selectedUser.role)}`}>
                        {getRoleIcon(selectedUser.role)} {selectedUser.role}
                      </span>
                    </div>
                    {selectedUser.createdAt && (
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium pl-1">
                        <CalendarDaysIcon className="w-4 h-4 inline" /> Creado:
                        <span className="text-slate-800 font-bold">
                          {new Date(selectedUser.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-full font-black text-sm ${
                  selectedUser.isActive 
                    ? 'bg-emerald-100 text-emerald-600 border border-emerald-200' 
                    : 'bg-red-100 text-red-600 border border-red-200'
                }`}>
                  {selectedUser.isActive ? <><CheckCircleIcon className="w-5 h-5 inline" /> ACTIVO</> : <><XCircleIcon className="w-5 h-5 inline" /> INACTIVO</>}
                </div>
              </div>
            </div>

            {/* Acciones Rápidas */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100">
              <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                <BoltIcon className="w-5 h-5" /> Acciones Rápidas
              </h2>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Toggle Estado */}
                <button
                  onClick={() => handleToggleStatus(selectedUser)}
                  className={`p-6 rounded-2xl border-2 transition-all hover:shadow-lg ${
                    selectedUser.isActive 
                      ? 'border-red-200 bg-red-50 hover:bg-red-100' 
                      : 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100'
                  }`}
                >
                  <div className="text-3xl mb-2">{selectedUser.isActive ? <PauseCircleIcon className="w-8 h-8 mx-auto" /> : <PlayCircleIcon className="w-8 h-8 mx-auto" />}</div>
                  <div className="font-black text-sm">
                    {selectedUser.isActive ? 'Desactivar Usuario' : 'Activar Usuario'}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {selectedUser.isActive ? 'Impide el acceso al sistema' : 'Permite el acceso al sistema'}
                  </div>
                </button>

                {/* Reset Password */}
                <button
                  onClick={handleResetPassword}
                  className="p-6 rounded-2xl border-2 border-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition-all hover:shadow-lg"
                >
                  <div className="text-3xl mb-2"><KeyIcon className="w-8 h-8 mx-auto" /></div>
                  <div className="font-black text-sm">Resetear Contraseña</div>
                  <div className="text-xs text-slate-500 mt-1">Establecer contraseña temporal</div>
                </button>

                {/* Editar Usuario */}
                <button
                  onClick={handleEditUser}
                  className="p-6 rounded-2xl border-2 border-purple-200 bg-purple-50 hover:bg-purple-100 transition-all hover:shadow-lg"
                >
                  <div className="text-3xl mb-2"><PencilIcon className="w-8 h-8 mx-auto" /></div>
                  <div className="font-black text-sm">Editar Usuario</div>
                  <div className="text-xs text-slate-500 mt-1">Modificar nombre o rol</div>
                </button>
              </div>

              {/* Eliminar Usuario */}
              <div className="mt-6 pt-6 border-t border-slate-100">
                <button
                  onClick={() => handleDeleteUser(selectedUser)}
                  className="w-full p-4 rounded-2xl border-2 border-red-200 bg-red-50 hover:bg-red-100 transition-all hover:shadow-lg flex items-center justify-center gap-3"
                >
                  <TrashIcon className="w-5 h-5 inline" />
                  <div className="font-black text-sm text-red-600">Eliminar Usuario</div>
                </button>
              </div>
            </div>

            {/* Información Adicional */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] p-8 text-white shadow-xl">
              <h2 className="text-xl font-black mb-6 flex items-center gap-2">
                <ChartBarIcon className="w-5 h-5" /> Información de la Cuenta
              </h2>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="p-4 bg-white/10 rounded-2xl">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">ID de Usuario</div>
                  <div className="font-mono text-sm truncate">{selectedUser.id}</div>
                </div>
                <div className="p-4 bg-white/10 rounded-2xl">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Estado Actual</div>
                  <div className="font-bold">{selectedUser.isActive ? <><CheckCircleIcon className="w-4 h-4 inline" /> Operativo</> : <><XCircleIcon className="w-4 h-4 inline" /> Suspendido</>}</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 p-10 text-center">
            <HandRaisedIcon className="w-16 h-16 mb-6 opacity-50 mx-auto" />
            <h3 className="text-xl font-bold text-slate-600 mb-2">Selecciona un usuario</h3>
            <p className="text-sm max-w-md">Haz clic en un usuario de la lista para ver sus detalles y gestionar su cuenta</p>
          </div>
        )}
      </div>

      {/* Modal para crear usuario */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>
            
            <div className="relative z-10">
              <h3 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2">
                <PlusIcon className="w-5 h-5" /> Nuevo Usuario
              </h3>
              <form onSubmit={handleAddUser}>
                <div className="mb-4">
                  <label className="block text-sm font-bold text-slate-600 mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-3 border border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-bold text-slate-600 mb-2">Nombre</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-3 border border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-bold text-slate-600 mb-2">Contraseña</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full p-3 border border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-bold text-slate-600 mb-2">Rol</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full p-3 border border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="ADMIN">Administrador</option>
                    <option value="VENDEDOR">Vendedor</option>
                    <option value="CONTADOR">Contador</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); setFormData({ email: '', password: '', name: '', role: 'ADMIN' }); }}
                    className="px-6 py-3 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-indigo-700 text-white rounded-xl font-bold hover:bg-indigo-800 transition-colors shadow-lg shadow-indigo-700/30"
                  >
                    Crear Usuario
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal para confirmar eliminación */}
      {showDeleteModal && userToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>
            
            <div className="relative z-10 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ExclamationTriangleIcon className="w-8 h-8 text-amber-500" />
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-2">Confirmar Eliminación</h3>
              <p className="text-slate-500 mb-6">¿Estás seguro de eliminar al usuario <strong className="text-slate-800">{userToDelete.email}</strong>? Esta acción no se puede deshacer.</p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => { setShowDeleteModal(false); setUserToDelete(null); }}
                  className="px-6 py-3 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDeleteUser}
                  className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-600/30"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para resetear contraseña */}
      {showResetModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>
            
            <div className="relative z-10">
              <h3 className="text-2xl font-black text-slate-800 mb-2 flex items-center gap-2">
                <KeyIcon className="w-5 h-5" /> Restablecer Contraseña
              </h3>
              <p className="text-slate-500 mb-6">Usuario: <strong className="text-slate-800">{selectedUser.email}</strong></p>
              <form onSubmit={confirmResetPassword}>
                <div className="mb-6">
                  <label className="block text-sm font-bold text-slate-600 mb-2">Nueva Contraseña Temporal</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={tempPassword}
                      onChange={(e) => setTempPassword(e.target.value)}
                      className="w-full p-3 border border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowResetModal(false); setTempPassword(''); }}
                    className="px-6 py-3 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-indigo-700 text-white rounded-xl font-bold hover:bg-indigo-800 transition-colors shadow-lg shadow-indigo-700/30"
                  >
                    Restablecer
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal para editar usuario */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>
            
            <div className="relative z-10">
              <h3 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2">
                <PencilIcon className="w-5 h-5" /> Editar Usuario
              </h3>
              <form onSubmit={confirmEditUser}>
                <div className="mb-4">
                  <label className="block text-sm font-bold text-slate-600 mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-3 border border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 bg-slate-100"
                    disabled
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-bold text-slate-600 mb-2">Nombre</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-3 border border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-bold text-slate-600 mb-2">Nueva Contraseña (opcional)</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full p-3 border border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Dejar en blanco para mantener la actual"
                  />
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-bold text-slate-600 mb-2">Rol</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full p-3 border border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                  >
                    <option value="ADMIN">Administrador</option>
                    <option value="VENDEDOR">Vendedor</option>
                    <option value="CONTADOR">Contador</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowEditModal(false); setFormData({ email: '', password: '', name: '', role: 'ADMIN' }); }}
                    className="px-6 py-3 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors shadow-lg shadow-purple-600/30"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyUsers;
