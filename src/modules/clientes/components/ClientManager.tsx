import React, { useState, useMemo } from 'react';
import { Client } from '../../../types/types';
import { validateEcuadorianId, getEntityAvatarColor } from '../../../utils/validation';
import {
  IdentificationIcon,
  ShoppingCartIcon,
  TruckIcon,
  MagnifyingGlassIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  ChatBubbleLeftRightIcon,
  KeyIcon,
  UserIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface ClientManagerProps {
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  onNotify: (msg: string, type?: any) => void;
  isDemoMode: boolean; // <--- Prop recibida correctamente
  currentUser?: any;
}

// URL del backend
const API_URL = import.meta.env.VITE_BACKEND_URL || '';

const ClientManager: React.FC<ClientManagerProps> = ({ clients, setClients, onNotify, isDemoMode, currentUser }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState<Partial<Client>>({ type: 'CLIENTE' });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'TODOS' | 'CLIENTE' | 'PROVEEDOR'>('TODOS');
  const [loading, setLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPasswordClient, setResetPasswordClient] = useState<Client | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const safeClients = Array.isArray(clients) ? clients : [];

  const stats = useMemo(() => ({
    total: safeClients.length,
    clients: safeClients.filter(c => c.type === 'CLIENTE' || c.type === 'AMBOS').length,
    suppliers: safeClients.filter(c => c.type === 'PROVEEDOR' || c.type === 'AMBOS').length
  }), [safeClients]);

  const filteredClients = useMemo(() => {
    return safeClients.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.ruc.includes(searchTerm);
      const matchesType = filterType === 'TODOS' || c.type === filterType || c.type === 'AMBOS';
      return matchesSearch && matchesType;
    });
  }, [safeClients, searchTerm, filterType]);

  const handleOpenModal = (client?: Client) => {
    if (client) {
      if (client.ruc === '9999999999999') {
        onNotify("Consumidor Final no puede ser editado", "warning");
        return;
      }
      setEditingClient(client);
      setFormData(client);
    } else {
      setEditingClient(null);
      setFormData({ type: 'CLIENTE', address: '', email: '', phone: '', name: '', ruc: '' });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.ruc || !formData.name) {
      onNotify("RUC y Razón Social son obligatorios", "error");
      return;
    }

    if (!validateEcuadorianId(formData.ruc) && formData.ruc !== '9999999999999') {
      onNotify("El RUC/Cédula ingresado no es válido para Ecuador", "error");
      return;
    }

    // 1. LÓGICA MODO DEMO
    if (isDemoMode) {
      const fakeClient = {
        ...formData,
        id: editingClient ? editingClient.id : Math.random().toString(),
        email: formData.email || '',
        address: formData.address || '',
        phone: formData.phone || '',
        type: formData.type || 'CLIENTE'
      } as Client;

      if (editingClient) {
        setClients(safeClients.map(c => c.id === editingClient.id ? fakeClient : c));
        onNotify("Cliente actualizado (Modo Demo)");
      } else {
        setClients([fakeClient, ...clients]);
        onNotify("Cliente creado (Modo Demo)");
      }
      setShowModal(false);
      return; // 🛑 IMPORTANTE: Detenemos aquí para no llamar al backend
    }

    // 2. LÓGICA MODO LIVE (Backend)
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      const payload = {
        ...formData,
        email: formData.email || '',
        address: formData.address || '',
        phone: formData.phone || '',
        type: formData.type || 'CLIENTE'
      };

      if (editingClient) {
        // ACTUALIZAR (PUT)
        const response = await fetch(`${API_URL}/api/clients/${editingClient.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.message || err.error || 'Error al actualizar cliente');
        }

        const updatedClient = await response.json();
        setClients(safeClients.map(c => c.id === editingClient.id ? updatedClient : c));
        onNotify("Entidad actualizada correctamente en base de datos");
      } else {
        // CREAR (POST)
        const response = await fetch(`${API_URL}/api/clients`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.message || err.error || 'Error al crear cliente');
        }

        const newClient = await response.json();
        setClients([newClient, ...clients]);
        onNotify("Entidad guardada exitosamente");
      }
      setShowModal(false);
    } catch (error: any) {
      console.error(error);
      onNotify(error.message || "Error de conexión con el servidor", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, ruc: string) => {
    if (ruc === '9999999999999') {
      onNotify("No se puede eliminar Consumidor Final", "error");
      return;
    }

    // SEGURIDAD: Restringir eliminación para vendedores
    if (currentUser?.role === 'VENDEDOR') {
      onNotify("Acción restringida. Se requiere permiso de Administrador.", "error");
      return;
    }

    if (confirm("¿Está seguro de eliminar esta entidad?")) {
      // 1. MODO DEMO
      if (isDemoMode) {
        setClients(safeClients.filter(c => c.id !== id));
        onNotify("Entidad eliminada (Modo Demo)");
        return;
      }

      // 2. MODO LIVE
      try {
        const response = await fetch(`${API_URL}/api/clients/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
        });
        if (!response.ok) throw new Error('Error al eliminar');

        setClients(safeClients.filter(c => c.id !== id));
        onNotify("Entidad eliminada de la base de datos");
      } catch (error) {
        onNotify("Error al eliminar del servidor", "error");
      }
    }
  }; // <--- AQUÍ TERMINA LA FUNCIÓN handleDelete

  const handleResetPassword = async () => {
    if (!resetPasswordClient || !newPassword) {
      onNotify("Ingrese una nueva contraseña", "error");
      return;
    }

    // MODO DEMO
    if (isDemoMode) {
      onNotify("Contraseña restablecida (Modo Demo)");
      setShowResetModal(false);
      setNewPassword('');
      setResetPasswordClient(null);
      return;
    }

    // MODO LIVE
    try {
      const response = await fetch(`${API_URL}/api/clients/${resetPasswordClient.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ newPassword })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Error al resetear contraseña');
      }

      onNotify("Contraseña restablecida correctamente");
      setShowResetModal(false);
      setNewPassword('');
      setResetPasswordClient(null);
    } catch (error: any) {
      console.error(error);
      onNotify(error.message || "Error de conexión con el servidor", "error");
    }
  };

  // --- AQUÍ EMPIEZA EL RENDERIZADO DEL COMPONENTE (ESTABA DENTRO DE handleDelete) ---
  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      {/* Cards de Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Entidades Totales', value: stats.total, icon: <IdentificationIcon className="w-7 h-7" />, color: 'slate' },
          { label: 'Clientes Activos', value: stats.clients, icon: <ShoppingCartIcon className="w-7 h-7" />, color: 'blue' },
          { label: 'Proveedores', value: stats.suppliers, icon: <TruckIcon className="w-7 h-7" />, color: 'emerald' },
        ].map((s, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-6">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl bg-${s.color}-50 dark:bg-${s.color}-900/30 text-${s.color}-600 dark:text-${s.color}-400`}>
              {s.icon}
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{s.label}</p>
              <p className="text-3xl font-black text-slate-900 dark:text-white">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Controles de Directorio */}
      <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 md:p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col lg:flex-row justify-between items-center gap-4 sm:gap-6">
        <div className="flex flex-col md:flex-row gap-3 sm:gap-4 w-full lg:w-auto">
          <div className="relative w-full md:w-64 lg:w-80">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Nombre o RUC..."
              className="w-full md:w-64 lg:w-80 bg-slate-50 dark:bg-slate-700 p-3 sm:p-4 pl-10 sm:pl-12 rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-indigo-500 transition-all min-h-[48px] text-slate-800 dark:text-white"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex bg-slate-50 dark:bg-slate-700 p-1 rounded-2xl">
            {(['TODOS', 'CLIENTE', 'PROVEEDOR'] as const).map(t => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-4 sm:px-6 py-2.5 sm:py-3 text-[10px] font-black uppercase rounded-xl transition-all min-h-[44px] ${filterType === t ? 'bg-white dark:bg-slate-600 shadow-sm text-indigo-700 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-400'}`}
              >
                {t === 'TODOS' ? 'Todos' : t === 'CLIENTE' ? 'Clientes' : 'Proveedores'}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="w-full lg:w-auto bg-slate-900 dark:bg-indigo-700 text-white px-6 sm:px-10 py-4 sm:py-5 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-slate-200 dark:shadow-slate-900 min-h-[52px]"
        >
          + Agregar Entidad
        </button>
      </div>

      {/* Listado de Tarjetas Premium */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {filteredClients.map(client => (
          <div key={client.id} className="bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-2xl transition-all group overflow-hidden flex flex-col">
            <div className="p-5 sm:p-8 flex-1">
              <div className="flex justify-between items-start mb-4 sm:mb-6">
                <div className={`w-12 sm:w-14 h-12 sm:h-14 rounded-2xl ${getEntityAvatarColor(client.name)} flex items-center justify-center text-white font-black text-lg sm:text-xl shadow-lg`}>
                  {client.name.charAt(0)}
                </div>
                <div className="flex flex-col items-end">
                  <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${client.type === 'CLIENTE' ? 'bg-indigo-50 text-indigo-700' :
                      client.type === 'PROVEEDOR' ? 'bg-emerald-50 text-emerald-600' : 'bg-purple-50 text-purple-600'
                    }`}>
                    {client.type}
                  </span>
                  <p className="text-[10px] font-mono text-slate-400 mt-2">{client.ruc}</p>
                </div>
              </div>

              <h4 className="text-xl font-black text-slate-800 dark:text-white tracking-tight leading-tight mb-2 group-hover:text-indigo-700 transition-colors">
                {client.name}
              </h4>
              <div className="space-y-3 mt-6">
                {client.email && (
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <EnvelopeIcon className="w-4 h-4 opacity-50 inline" /> {client.email}
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <PhoneIcon className="w-4 h-4 opacity-50 inline" /> {client.phone}
                  </div>
                )}
                {client.address && (
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                    <MapPinIcon className="w-4 h-4 opacity-50 inline" /> {client.address}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-50/50 dark:bg-slate-700/50 p-6 flex justify-between items-center border-t border-slate-50 dark:border-slate-600">
              <div className="flex gap-2">
                {client.phone && (
                  <button
                    onClick={() => window.open(`https://wa.me/593${client.phone.replace(/^0/, '')}`, '_blank')}
                    className="w-10 h-10 bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-xl flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all shadow-sm min-w-[40px] min-h-[40px]"
                    title="WhatsApp"
                  ><ChatBubbleLeftRightIcon className="w-4 h-4" /></button>
                )}
                {client.email && (
                  <button
                    onClick={() => window.location.href = `mailto:${client.email}`}
                    className="w-10 h-10 bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-xl flex items-center justify-center hover:bg-indigo-500 hover:text-white transition-all shadow-sm min-w-[40px] min-h-[40px]"
                    title="Email"
                  ><EnvelopeIcon className="w-4 h-4" /></button>
                )}
                {client.address && (
                  <button
                    onClick={() => window.open(`https://www.google.com/maps/search/${encodeURIComponent(client.address)}`, '_blank')}
                    className="w-10 h-10 bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all shadow-sm min-w-[40px] min-h-[40px]"
                    title="Mapa"
                  ><MapPinIcon className="w-4 h-4" /></button>
                )}
              </div>
              <div className="flex gap-4">
                <button onClick={() => handleOpenModal(client)} className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest hover:text-indigo-700 dark:hover:text-indigo-400 transition-colors">Editar</button>
                <button onClick={() => { setResetPasswordClient(client); setShowResetModal(true); }} className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest hover:text-amber-500 transition-colors"><KeyIcon className="w-4 h-4 inline" /> Reset</button>
                <button onClick={() => handleDelete(client.id, client.ruc)} className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest hover:text-rose-500 transition-colors">Eliminar</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[110] p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-800 rounded-[3.5rem] w-full max-w-2xl shadow-2xl animate-in zoom-in duration-300 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 sm:p-10 sm:p-12 space-y-6 sm:space-y-8 overflow-y-auto">
              <div className="flex justify-between items-center">
                <h4 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                  {editingClient ? 'Actualizar Entidad' : 'Nueva Entidad'}
                </h4>
                <div className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 p-3 rounded-2xl"><UserIcon className="w-6 h-6" /></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">RUC / Cédula</label>
                  <input
                    placeholder="Ej: 1722334455001"
                    value={formData.ruc || ''}
                    className="w-full p-3 sm:p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-indigo-500 transition-all min-h-[48px] text-sm sm:text-base"
                    onChange={e => setFormData({ ...formData, ruc: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Entidad</label>
                  <select
                    className="w-full p-3 sm:p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-indigo-500 transition-all appearance-none min-h-[48px] text-sm sm:text-base"
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                  >
                    <option value="CLIENTE">CLIENTE</option>
                    <option value="PROVEEDOR">PROVEEDOR</option>
                    <option value="AMBOS">AMBOS (B2B)</option>
                  </select>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Razón Social / Nombre Completo</label>
                  <input
                    placeholder="Ej: Juan Pérez o Empresa S.A."
                    value={formData.name || ''}
                    className="w-full p-3 sm:p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-indigo-500 transition-all min-h-[48px] text-sm sm:text-base"
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Correo Electrónico</label>
                  <input
                    placeholder="email@ejemplo.com"
                    value={formData.email || ''}
                    className="w-full p-3 sm:p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-indigo-500 transition-all min-h-[48px] text-sm sm:text-base"
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Teléfono / WhatsApp</label>
                  <input
                    placeholder="Ej: 0998877665"
                    value={formData.phone || ''}
                    className="w-full p-3 sm:p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-indigo-500 transition-all min-h-[48px] text-sm sm:text-base"
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dirección Completa</label>
                  <input
                    placeholder="Ej: Av. Amazonas y República, Quito"
                    value={formData.address || ''}
                    className="w-full p-3 sm:p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-indigo-500 transition-all min-h-[48px] text-sm sm:text-base"
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button onClick={() => setShowModal(false)} className="flex-1 py-4 sm:py-5 font-black text-slate-400 uppercase text-[10px] tracking-widest hover:text-slate-600 transition-colors min-h-[48px]">Cancelar</button>
                <button onClick={handleSave} className="flex-[2] py-4 sm:py-5 font-black bg-indigo-700 text-white rounded-[1.5rem] shadow-xl shadow-indigo-100 uppercase text-[10px] tracking-widest hover:scale-[1.02] active:scale-95 transition-all min-h-[52px]">
                  {editingClient ? 'Guardar Cambios' : 'Registrar Entidad'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Reset de Contraseña */}
      {showResetModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[110] p-4">
          <div className="bg-white dark:bg-slate-800 rounded-[3.5rem] w-full max-w-md shadow-2xl animate-in zoom-in duration-300 overflow-hidden flex flex-col">
            <div className="p-10 space-y-6">
              <div className="flex justify-between items-center">
                <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">
                  <KeyIcon className="w-5 h-5 inline" /> Resetear Contraseña
                </h4>
                <button onClick={() => { setShowResetModal(false); setResetPasswordClient(null); setNewPassword(''); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><XMarkIcon className="w-5 h-5" /></button>
              </div>
              
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Ingrese la nueva contraseña para el cliente <span className="font-bold text-slate-700 dark:text-slate-200">{resetPasswordClient?.name}</span>
              </p>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nueva Contraseña</label>
                <input
                  type="password"
                  placeholder="Ingrese nueva contraseña"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-amber-500 transition-all"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => { setShowResetModal(false); setResetPasswordClient(null); setNewPassword(''); }} 
                  className="flex-1 py-4 font-black text-slate-400 uppercase text-[10px] tracking-widest hover:text-slate-600 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleResetPassword} 
                  className="flex-[2] py-4 font-black bg-amber-500 text-white rounded-[1.5rem] shadow-xl shadow-amber-100 uppercase text-[10px] tracking-widest hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Guardar Nueva Contraseña
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientManager;
