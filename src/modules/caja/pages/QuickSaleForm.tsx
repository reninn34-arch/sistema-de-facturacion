import React, { useState, useEffect, useRef, useId } from 'react';
import { Product, InvoiceItem, BusinessInfo } from '../../../types/types';
import { MagnifyingGlassIcon, TicketIcon, XMarkIcon, MinusIcon, PlusIcon, BanknotesIcon, CreditCardIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { client } from '../../../api/client';
import CashClosingModal from '../components/CashClosingModal';

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

interface QuickSaleFormProps {
  products: Product[];
  clients?: any[];
  setClients?: (clients: any) => void;
  businessInfo: BusinessInfo;
  onNotify: (msg: string, type?: any) => void;
  onTicketCreated?: (ticket: any) => void;
}

interface CartItem {
  productId: string;
  description: string;
  code: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  total: number;
  stock: number;
  imageUrl?: string | null;
}

const QuickSaleForm: React.FC<QuickSaleFormProps> = ({ products, clients = [], setClients, businessInfo, onNotify, onTicketCreated }) => {
  const fieldId = useId();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('EFECTIVO');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastTicket, setLastTicket] = useState<any>(null);
  const [showTicket, setShowTicket] = useState(false);
  const [amountReceived, setAmountReceived] = useState<number | ''>('');
  
  // Productos recientes (como Emojis recientes)
  const [recentProductIds, setRecentProductIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('recentCajaProducts') || '[]');
    } catch {
      return [];
    }
  });

  // Cliente states
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [newClientData, setNewClientData] = useState({ ruc: '', name: '', email: '', phone: '', address: '' });

  const searchRef = useRef<HTMLDivElement>(null);
  const clientSearchRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown de cliente al hacer click afuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (clientSearchRef.current && !clientSearchRef.current.contains(e.target as Node)) {
        setClientSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Solo productos terminados (no materia prima) para venta en caja
  const sellableProducts = products.filter(p => !p.isRawMaterial);

  // Buscar productos con filtro
  const filteredProducts = sellableProducts.filter(p =>
    !searchTerm || p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.code.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 8);

  // Calcular totales
  const subtotal12 = cart.reduce((sum, item) => item.taxRate > 0 ? sum + (item.quantity * item.unitPrice - item.discount) : sum, 0);
  const subtotal0 = cart.reduce((sum, item) => item.taxRate === 0 ? sum + (item.quantity * item.unitPrice - item.discount) : sum, 0);
  const subtotal = subtotal12 + subtotal0;
  const iva = cart.reduce((sum, item) => item.taxRate > 0 ? sum + (item.quantity * item.unitPrice - item.discount) * (item.taxRate / 100) : sum, 0);
  const total = subtotal + iva;

  // Agregar al carrito
  const addToCart = (product: Product) => {
    // Actualizar productos recientes
    const filtered = recentProductIds.filter(id => id !== product.id);
    const updated = [product.id, ...filtered].slice(0, 12);
    setRecentProductIds(updated);
    try {
      localStorage.setItem('recentCajaProducts', JSON.stringify(updated));
    } catch { /* */ }

    const existing = cart.find(p => p.productId === product.id);
    if (existing) {
      if (existing.quantity >= existing.stock && existing.stock > 0) {
        onNotify('Stock insuficiente', 'error');
        return;
      }
      setCart(prev => prev.map(p =>
        p.productId === product.id
          ? { ...p, quantity: p.quantity + 1, total: (p.quantity + 1) * p.unitPrice }
          : p
      ));
    } else {
      setCart(prev => [...prev, {
        productId: product.id,
        description: product.description,
        code: product.code,
        quantity: 1,
        unitPrice: product.price,
        discount: 0,
        taxRate: product.taxRate,
        total: product.price,
        stock: product.stock,
        imageUrl: product.imageUrl,
      }]);
    }
    setSearchTerm('');
    setShowSearchResults(false);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId !== productId) return item;
      const newQty = Math.max(0, item.quantity + delta);
      if (newQty === 0) return null;
      if (delta > 0 && item.stock > 0 && newQty > item.stock) return item;
      return { ...item, quantity: newQty, total: newQty * item.unitPrice };
    }).filter(Boolean) as CartItem[]);
  };

  const removeItem = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  // Generar número de ticket secuencial (basado en fecha + contador local)
  const generateTicketNumber = () => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    return `TKT-${dateStr}-${timeStr}`;
  };

  // Cobrar / Crear Ticket
  const handleCharge = async () => {
    if (cart.length === 0) {
      onNotify('Agregue productos al ticket', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const ticketNumber = generateTicketNumber();
      const ticketData = {
        sequential: Date.now(),
        number: ticketNumber,
        items: cart.map(item => ({
          productId: item.productId,
          description: item.description,
          qty: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total
        })),
        subtotal,
        iva,
        total,
        paymentMethod,
        status: 'PENDIENTE',
        notes: `Ticket generado en caja - ${new Date().toLocaleString('es-EC')}`,
        clientId: selectedClient?.id || null,
        clientName: selectedClient?.name || null,
        clientIdentification: selectedClient?.ruc || null,
      };

      // Intentar guardar en backend
      try {
        const res = await client.post('/api/quicksales', ticketData);
        const saved = res.data;
        setLastTicket(saved);
        if (onTicketCreated) onTicketCreated(saved);
        onNotify(`Ticket ${ticketNumber} generado - Total: $${total.toFixed(2)}`, 'success');
      } catch {
        // Si falla backend o no hay red, guardar en cola offline para auto-sincronización
        const offlineTicket = { ...ticketData, id: `offline-${Date.now()}`, offline: true };
        const existingQueue = JSON.parse(localStorage.getItem('offlineTicketsQueue') || '[]');
        localStorage.setItem('offlineTicketsQueue', JSON.stringify([...existingQueue, offlineTicket]));
        setLastTicket(offlineTicket);
        if (onTicketCreated) onTicketCreated(offlineTicket);
        onNotify(`📴 Modo Offline: Ticket ${ticketNumber} guardado en caja para auto-sincronización`, 'warning');
      }

      setShowTicket(true);

    } catch (error) {
      onNotify('Error al generar ticket', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sincronización automática de tickets offline al recuperar conectividad
  useEffect(() => {
    const syncOfflineQueue = async () => {
      const queue = JSON.parse(localStorage.getItem('offlineTicketsQueue') || '[]');
      if (queue.length === 0) return;

      let syncedCount = 0;
      const remainingQueue = [];

      for (const ticket of queue) {
        try {
          const { id, offline, ...cleanTicket } = ticket;
          await client.post('/api/quicksales', cleanTicket);
          syncedCount++;
        } catch (e) {
          remainingQueue.push(ticket);
        }
      }

      localStorage.setItem('offlineTicketsQueue', JSON.stringify(remainingQueue));
      if (syncedCount > 0) {
        onNotify(`🌐 Conexión restaurada: Se sincronizaron ${syncedCount} tickets guardados en offline`, 'success');
      }
    };

    window.addEventListener('online', syncOfflineQueue);
    // Intentar sync inicial si hay red
    if (navigator.onLine) {
      syncOfflineQueue();
    }

    return () => {
      window.removeEventListener('online', syncOfflineQueue);
    };
  }, []);

  // Nuevo ticket (limpiar carrito)
  const newTicket = () => {
    setCart([]);
    setLastTicket(null);
    setShowTicket(false);
    setPaymentMethod('EFECTIVO');
    setAmountReceived('');
    setSelectedClient(null);
  };

  // Cerrar sesión de caja al click fuera del buscador
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientData.ruc || !newClientData.name) {
      onNotify('RUC y Nombre son obligatorios', 'error');
      return;
    }
    
    setIsCreatingClient(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_URL}/api/business/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...newClientData, type: 'CLIENTE' })
      });
      
      const data = await res.json();
      if (res.ok) {
        onNotify('Cliente creado exitosamente');
        if (setClients) {
          setClients([...clients, data]);
        }
        setSelectedClient(data);
        setShowClientModal(false);
        setNewClientData({ ruc: '', name: '', email: '', phone: '', address: '' });
      } else {
        onNotify(data.message || 'Error al crear cliente', 'error');
      }
    } catch (err) {
      onNotify('Error de conexión', 'error');
    } finally {
      setIsCreatingClient(false);
    }
  };

  const filteredClients = clients.filter(c => 
    !clientSearchTerm || 
    c.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) || 
    c.ruc.includes(clientSearchTerm)
  ).slice(0, 5);

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'EFECTIVO': return BanknotesIcon;
      case 'TARJETA': return CreditCardIcon;
      case 'TRANSFERENCIA': return ArrowPathIcon;
      default: return BanknotesIcon;
    }
  };

  const PaymentIconComponent = getPaymentIcon(paymentMethod);

  // Vista del ticket emitido
  if (showTicket && lastTicket) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-700 shadow-sm">
          <div className="text-center space-y-1 mb-6">
            <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">
              {businessInfo.tradename || businessInfo.name}
            </h2>
            <p className="text-xs text-slate-400 font-bold">{businessInfo.ruc}</p>
            <p className="text-xs text-slate-400">{businessInfo.branchAddress || businessInfo.address}</p>
            <div className="border-t border-dashed border-slate-200 dark:border-slate-600 mt-2 pt-2">
              <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">TICKET</p>
              <p className="text-xs text-slate-500 font-bold">{lastTicket.number || `#${lastTicket.sequential}`}</p>
              <p className="text-[10px] text-slate-400">{new Date().toLocaleString('es-EC')}</p>
            </div>
          </div>

          <table className="w-full text-sm mb-4">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-2 text-[10px] font-black text-slate-400 uppercase">Cant</th>
                <th className="text-left py-2 text-[10px] font-black text-slate-400 uppercase">Producto</th>
                <th className="text-right py-2 text-[10px] font-black text-slate-400 uppercase">P.Unit</th>
                <th className="text-right py-2 text-[10px] font-black text-slate-400 uppercase">Total</th>
              </tr>
            </thead>
            <tbody>
              {lastTicket.items?.map((item: any) => (
                <tr key={item.productId || item.description} className="border-b border-slate-100 dark:border-slate-700/50">
                  <td className="py-2 font-bold">{item.qty || item.quantity}</td>
                  <td className="py-2 text-xs">{item.description}</td>
                  <td className="py-2 text-right text-xs">${(item.unitPrice || 0).toFixed(2)}</td>
                  <td className="py-2 text-right font-bold">${(item.total || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t border-slate-200 dark:border-slate-600 pt-3 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Subtotal 12%:</span><span>${subtotal12.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Subtotal 0%:</span><span>${subtotal0.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">IVA 15%:</span><span>${iva.toFixed(2)}</span></div>
            <div className="flex justify-between font-black text-lg border-t border-slate-200 dark:border-slate-600 pt-1">
              <span>TOTAL</span><span>${total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs"><span className="text-slate-500">Forma de pago:</span>
              <span className="font-bold">
                {paymentMethod === 'EFECTIVO' ? 'Efectivo' : paymentMethod === 'TARJETA' ? 'Tarjeta' : 'Transferencia'}
              </span>
            </div>
            <p className="text-center text-[10px] text-slate-400 pt-2">
              Estado: <span className="text-amber-600 font-bold">PENDIENTE DE ENVÍO AL SRI</span>
            </p>
            <p className="text-center text-[10px] text-slate-300">Gracias por su compra</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="button"
            onClick={newTicket}
            className="flex-1 py-4 rounded-2xl font-black text-sm uppercase bg-sky-500 text-white hover:bg-sky-500 transition-colors shadow-lg"
          >
            Nuevo Ticket
          </button>
          <button type="button"
            onClick={() => window.print()}
            className="py-4 px-8 rounded-2xl font-black text-sm uppercase bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            Imprimir
          </button>
        </div>
      </div>
    );
  }

  const [showCashClosing, setShowCashClosing] = useState(false);
  const [createdTickets, setCreatedTickets] = useState<any[]>([]);

  // Vista principal del POS
  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-3">
            <TicketIcon className="w-8 h-8 text-sky-500" />
            Caja / Ticket
          </h2>
          <p className="text-sm text-slate-400 font-bold mt-1">Venta rápida sin emisión inmediata al SRI y arqueo de turno</p>
        </div>
        <div className="flex items-center gap-3">
          <button type="button"
            onClick={() => setShowCashClosing(true)}
            className="px-6 py-3 rounded-2xl font-black text-xs uppercase bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-lg shadow-emerald-600/20 flex items-center gap-2"
          >
            <BanknotesIcon className="w-4 h-4" /> Arqueo de Caja
          </button>
          {cart.length > 0 && (
            <button type="button"
              onClick={newTicket}
              className="px-6 py-3 rounded-2xl font-black text-xs uppercase bg-red-50 dark:bg-red-500/10 text-red-600 border border-red-200 dark:border-red-500/20 hover:bg-red-100 transition-colors"
            >
              Cancelar venta
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Columna izquierda: productos */}
        <div className="lg:col-span-7 space-y-4">
          {/* Buscador */}
          <div ref={searchRef} className="relative">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar producto por nombre o código..."
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setShowSearchResults(true); }}
                onFocus={() => searchTerm && setShowSearchResults(true)}
                className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-800 rounded-2xl font-bold text-sm outline-none border-2 border-slate-200 dark:border-slate-700 focus:border-sky-500 transition-colors"
                autoComplete="off"
              />
              {searchTerm && (
                <button type="button" aria-label="Limpiar búsqueda" onClick={() => { setSearchTerm(''); setShowSearchResults(false); }} className="absolute right-4 top-1/2 -translate-y-1/2">
                  <XMarkIcon className="w-4 h-4 text-slate-400" />
                </button>
              )}
            </div>

            {/* Resultados de búsqueda */}
            {showSearchResults && filteredProducts.length > 0 && (
              <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden max-h-64 overflow-y-auto">
                {filteredProducts.map(product => (
                  <button type="button"
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-sky-50 dark:hover:bg-sky-500/10 transition-colors text-left"
                  >
                    <div>
                      <p className="font-bold text-sm text-slate-800 dark:text-white">{product.description}</p>
                      <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5 flex-wrap mt-0.5">
                        <span>{product.code} · Stock Total: {product.stock}</span>
                        {product.branchStock && Object.keys(product.branchStock).length > 0 && (
                          <span className="text-sky-600 dark:text-sky-400 font-bold bg-sky-50 dark:bg-sky-500/10 px-1.5 py-0.5 rounded text-[9px]">
                            🏬 {Object.entries(product.branchStock).map(([b, q]) => `${b === '001' ? 'Matriz' : `Suc.${b}`}: ${q}`).join(' | ')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-sm text-sky-500 dark:text-sky-400">${product.price.toFixed(2)}</p>
                      <p className="text-[10px] text-slate-400">IVA {product.taxRate}%</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Productos frecuentes / disponibles */}
          {!searchTerm && (
            <div className="mt-2 border-t border-slate-100 dark:border-slate-700 pt-6">
              <div className="flex justify-between items-center mb-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recientes</p>
                <p className="text-[10px] text-slate-400">{recentProductIds.length > 0 ? `${recentProductIds.length} productos` : 'Usa el buscador'}</p>
              </div>
              
              {recentProductIds.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[2rem] bg-slate-50 dark:bg-slate-800/50">
                  <MagnifyingGlassIcon className="w-8 h-8 mb-2 text-slate-300 dark:text-slate-600" />
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Sin productos recientes</p>
                  <p className="text-[10px]">Busca un producto y añádelo para que aparezca aquí</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar pb-10">
                  {(() => {
                    const productsList: typeof sellableProducts = [];
                    for (const id of recentProductIds) {
                      const p = sellableProducts.find(prod => prod.id === id);
                      if (p && (p.stock > 0 || p.type === 'SERVICIO')) {
                        productsList.push(p);
                      }
                    }
                    return productsList.map(product => (
                      <button type="button"
                        key={product.id}
                        onClick={() => addToCart(product)}
                      className="bg-white dark:bg-slate-800 rounded-[1.5rem] p-3 border border-slate-200 dark:border-slate-700 hover:border-sky-500 hover:shadow-lg hover:shadow-indigo-500/10 transition-all text-left flex flex-col items-center group relative overflow-hidden"
                    >
                      <div className="w-full aspect-square rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-700/50 mb-3 relative flex items-center justify-center">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.description} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        ) : (
                          <TicketIcon className="w-8 h-8 text-slate-300 dark:text-slate-500" />
                        )}
                        
                        {/* Badge de stock bajo */}
                        {product.stock <= 5 && product.stock > 0 && product.type !== 'SERVICIO' && (
                          <div className="absolute bottom-2 right-2 bg-amber-500 text-white text-[9px] font-black px-2 py-0.5 rounded-md shadow-md">
                            Últimos {product.stock}
                          </div>
                        )}
                      </div>
                      
                      <p className="font-bold text-xs text-slate-800 dark:text-white text-center line-clamp-2 w-full group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                        {product.description}
                      </p>
                      <p className="text-[9px] text-slate-400 font-bold mt-1">{product.code}</p>
                      <p className="font-black text-sm text-sky-500 dark:text-sky-400 mt-1">${product.price.toFixed(2)}</p>
                    </button>
                  ))})()}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Columna derecha: carrito y cobro */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm p-6 flex flex-col h-fit">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h3 className="font-black text-slate-800 dark:text-white text-lg uppercase tracking-tighter">
              Ticket actual
            </h3>
            
            {/* Selector de Cliente Compacto */}
            <div className="relative w-48" ref={clientSearchRef}>
              {selectedClient ? (
                <div className="flex items-center justify-between bg-sky-50 dark:bg-sky-500/10 px-3 py-1.5 rounded-xl border border-sky-100 dark:border-sky-500/20">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-sky-500 dark:text-sky-400 truncate">{selectedClient.name}</p>
                    <p className="text-[9px] text-sky-500/70 font-bold">{selectedClient.ruc}</p>
                  </div>
                  <button type="button" aria-label="Quitar cliente" onClick={() => setSelectedClient(null)} className="ml-2 text-sky-400 hover:text-sky-600">
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div>
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Cliente (Cons. Final)" 
                      value={clientSearchTerm}
                      onChange={e => setClientSearchTerm(e.target.value)}
                      className="w-full pl-8 pr-2 py-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-bold outline-none focus:border-sky-500 transition-colors dark:text-white"
                    />
                  </div>
                  {clientSearchTerm && (
                    <div className="absolute z-50 mt-1 w-64 right-0 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                      {filteredClients.map(c => (
                        <button type="button" key={c.id} onClick={() => { setSelectedClient(c); setClientSearchTerm(''); }} className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700/50 last:border-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{c.name}</p>
                          <p className="text-[10px] text-slate-500">{c.ruc}</p>
                        </button>
                      ))}
                      <button type="button" 
                        onClick={() => { setShowClientModal(true); setClientSearchTerm(''); }}
                        className="w-full px-3 py-2 text-left bg-sky-50 dark:bg-sky-500/10 hover:bg-sky-100 text-sky-500 dark:text-sky-400 text-xs font-black flex items-center gap-2"
                      >
                        <PlusIcon className="w-3.5 h-3.5" /> Nuevo Cliente
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {cart.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
              <TicketIcon className="w-12 h-12 text-slate-200 dark:text-slate-600 mb-3" />
              <p className="text-sm text-slate-400 font-bold">Sin productos</p>
              <p className="text-xs text-slate-300">Busque y seleccione productos</p>
            </div>
          ) : (
            <div className="space-y-3 flex-1 overflow-y-auto max-h-96 pr-2 custom-scrollbar">
              {cart.map(item => (
                <div key={item.productId} className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                  
                  {/* Imagen en el carrito */}
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-600 flex-shrink-0 flex items-center justify-center border border-slate-200 dark:border-slate-600/50 shadow-inner">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.description} className="w-full h-full object-cover" />
                    ) : (
                      <TicketIcon className="w-5 h-5 text-slate-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs text-slate-800 dark:text-white truncate">{item.description}</p>
                    <p className="text-[9px] text-slate-400 font-bold">${item.unitPrice.toFixed(2)} c/u · IVA {item.taxRate}%</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="submit" aria-label="Disminuir cantidad" onClick={() => updateQuantity(item.productId, -1)} className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-600 flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-500">
                      <MinusIcon className="w-3 h-3 text-slate-600 dark:text-slate-300" />
                    </button>
                    <span className="w-8 text-center font-black text-sm">{item.quantity}</span>
                    <button type="submit" aria-label="Aumentar cantidad" onClick={() => updateQuantity(item.productId, 1)} className="w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-500/20 flex items-center justify-center hover:bg-sky-200">
                      <PlusIcon className="w-3 h-3 text-sky-500 dark:text-sky-400" />
                    </button>
                  </div>
                  <p className="font-black text-sm w-16 text-right">${item.total.toFixed(2)}</p>
                  <button type="button" aria-label="Quitar producto" onClick={() => removeItem(item.productId)} className="text-slate-300 hover:text-red-500">
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-slate-200 dark:border-slate-700 mt-4 pt-4 space-y-2">
            <div className="flex justify-between text-xs"><span className="text-slate-500">Sub 12%:</span><span>${subtotal12.toFixed(2)}</span></div>
            <div className="flex justify-between text-xs"><span className="text-slate-500">Sub 0%:</span><span>${subtotal0.toFixed(2)}</span></div>
            <div className="flex justify-between text-xs"><span className="text-slate-500">IVA 15%:</span><span>${iva.toFixed(2)}</span></div>
            <div className="flex justify-between font-black text-xl border-t border-slate-200 dark:border-slate-600 pt-2">
              <span>TOTAL</span><span>${total.toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Forma de pago</p>
            <div className="grid grid-cols-3 gap-1">
              {[
                { value: 'EFECTIVO', label: 'Efectivo', icon: BanknotesIcon },
                { value: 'TARJETA', label: 'Tarjeta', icon: CreditCardIcon },
                { value: 'TRANSFERENCIA', label: 'Transf.', icon: ArrowPathIcon },
              ].map(opt => (
                <button type="button"
                  key={opt.value}
                  onClick={() => setPaymentMethod(opt.value)}
                  className={`p-2 rounded-xl text-[10px] font-black uppercase transition-all flex flex-col items-center gap-1 ${paymentMethod === opt.value
                      ? 'bg-sky-500 text-white shadow-lg'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                    }`}
                >
                  <opt.icon className="w-4 h-4" />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Calculadora de Cambio Compacta */}
          {paymentMethod === 'EFECTIVO' && cart.length > 0 && (
            <div className="mt-4 p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700/50 dark:to-slate-700/30 rounded-2xl border border-slate-200 dark:border-slate-600 shadow-inner">
              <div className="flex justify-between items-center mb-3">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <BanknotesIcon className="w-4 h-4" />
                  Efectivo Recibido
                </p>
                <div className="flex gap-1 flex-wrap justify-end">
                  <button type="button" 
                    onClick={() => setAmountReceived(total)} 
                    className="px-2 py-1 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-lg text-[10px] font-black hover:bg-emerald-200 dark:hover:bg-emerald-500/30 transition-colors"
                  >
                    Exacto
                  </button>
                  {[5, 10, 20, 50, 100].map(amt => (
                    total <= amt && (
                      <button type="button" 
                        key={amt} 
                        onClick={() => setAmountReceived(amt)} 
                        className="px-2 py-1 bg-white dark:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-500 rounded-lg text-[10px] font-bold hover:bg-slate-50 dark:hover:bg-slate-500 transition-colors shadow-sm"
                      >
                        ${amt}
                      </button>
                    )
                  ))}
                </div>
              </div>
              
              <div className="flex gap-4 items-center">
                <div className="relative flex-[2]">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-black text-lg">$</span>
                  <input 
                    type="number" 
                    min="0"
                    step="0.01"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value ? parseFloat(e.target.value) : '')}
                    className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-800 rounded-xl font-black text-xl outline-none border-2 border-slate-200 dark:border-slate-600 focus:border-emerald-500 text-slate-800 dark:text-white transition-colors shadow-sm"
                    placeholder="0.00"
                  />
                </div>

                <div className="flex-[3] text-right">
                  {amountReceived !== '' && (amountReceived as number) >= total ? (
                    <div>
                      <span className="text-[10px] font-black text-slate-400 block mb-0.5">CAMBIO A ENTREGAR</span>
                      <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 leading-none block">
                        ${((amountReceived as number) - total).toFixed(2)}
                      </span>
                    </div>
                  ) : amountReceived !== '' ? (
                    <div>
                      <span className="text-[10px] font-black text-red-400 block mb-0.5">FALTA</span>
                      <span className="text-xl font-black text-red-500 dark:text-red-400 leading-none block">
                        ${(total - (amountReceived as number)).toFixed(2)}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          {/* Botón cobrar */}
          <button type="submit"
            onClick={handleCharge}
            disabled={cart.length === 0 || isSubmitting || (paymentMethod === 'EFECTIVO' && amountReceived !== '' && amountReceived < total)}
            className="mt-4 w-full py-4 rounded-2xl font-black text-sm uppercase bg-emerald-600 text-white hover:bg-emerald-500 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 transition-colors shadow-lg flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <><ArrowPathIcon className="w-5 h-5 animate-spin" /> Procesando...</>
            ) : (
              <><PaymentIconComponent className="w-5 h-5" /> Cobrar ${total.toFixed(2)}</>
            )}
          </button>
        </div>
      </div>

      {/* Modal de Nuevo Cliente */}
      {showClientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase">Nuevo Cliente</h3>
              <button type="button" aria-label="Cerrar" onClick={() => setShowClientModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                <XMarkIcon className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            <form onSubmit={handleCreateClient} className="p-6 space-y-4">
              <div className="space-y-1">
                <label htmlFor={`${fieldId}-ruc`} className="text-xs font-bold text-slate-500 uppercase">Cédula / RUC *</label>
                <input
                  id={`${fieldId}-ruc`}
                  type="text"
                  value={newClientData.ruc}
                  onChange={e => setNewClientData({...newClientData, ruc: e.target.value})}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-sky-500 text-sm font-bold dark:text-white"
                  required
                />
              </div>
              <div className="space-y-1">
                <label htmlFor={`${fieldId}-name`} className="text-xs font-bold text-slate-500 uppercase">Razón Social / Nombre *</label>
                <input
                  id={`${fieldId}-name`}
                  type="text"
                  value={newClientData.name}
                  onChange={e => setNewClientData({...newClientData, name: e.target.value})}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-sky-500 text-sm font-bold dark:text-white"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor={`${fieldId}-email`} className="text-xs font-bold text-slate-500 uppercase">Email</label>
                  <input
                    id={`${fieldId}-email`}
                    type="email"
                    value={newClientData.email}
                    onChange={e => setNewClientData({...newClientData, email: e.target.value})}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-sky-500 text-sm dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor={`${fieldId}-phone`} className="text-xs font-bold text-slate-500 uppercase">Teléfono</label>
                  <input
                    id={`${fieldId}-phone`}
                    type="text"
                    value={newClientData.phone}
                    onChange={e => setNewClientData({...newClientData, phone: e.target.value})}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-sky-500 text-sm dark:text-white"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label htmlFor={`${fieldId}-address`} className="text-xs font-bold text-slate-500 uppercase">Dirección</label>
                <input
                  id={`${fieldId}-address`}
                  type="text"
                  value={newClientData.address}
                  onChange={e => setNewClientData({...newClientData, address: e.target.value})}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-sky-500 text-sm dark:text-white"
                />
              </div>
              
              <div className="pt-4 flex gap-3">
                <button aria-label="Acción" 
                  type="button" 
                  onClick={() => setShowClientModal(false)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isCreatingClient}
                  className="flex-1 py-3 bg-sky-600 text-white font-bold rounded-xl text-sm hover:bg-sky-600 transition-colors disabled:opacity-50"
                >
                  {isCreatingClient ? 'Guardando...' : 'Guardar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Arqueo y Cierre de Caja */}
      <CashClosingModal
        isOpen={showCashClosing}
        onClose={() => setShowCashClosing(false)}
        businessInfo={businessInfo}
        tickets={createdTickets}
        onNotify={onNotify}
      />
    </div>
  );
};

export default QuickSaleForm;
