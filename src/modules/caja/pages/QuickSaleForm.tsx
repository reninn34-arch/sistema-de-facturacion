import React, { useState, useEffect, useRef } from 'react';
import { Product, InvoiceItem, BusinessInfo } from '../../../types/types';
import { MagnifyingGlassIcon, TicketIcon, XMarkIcon, MinusIcon, PlusIcon, BanknotesIcon, CreditCardIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

interface QuickSaleFormProps {
  products: Product[];
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
}

const QuickSaleForm: React.FC<QuickSaleFormProps> = ({ products, businessInfo, onNotify, onTicketCreated }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('EFECTIVO');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastTicket, setLastTicket] = useState<any>(null);
  const [showTicket, setShowTicket] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

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
  const iva = subtotal12 * 0.15;
  const total = subtotal + iva;

  // Agregar al carrito
  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(p => p.productId === product.id);
      if (existing) {
        if (existing.quantity >= existing.stock && existing.stock > 0) {
          onNotify('Stock insuficiente', 'error');
          return prev;
        }
        return prev.map(p =>
          p.productId === product.id
            ? { ...p, quantity: p.quantity + 1, total: (p.quantity + 1) * p.unitPrice }
            : p
        );
      }
      return [...prev, {
        productId: product.id,
        description: product.description,
        code: product.code,
        quantity: 1,
        unitPrice: product.price,
        discount: 0,
        taxRate: product.taxRate,
        total: product.price,
        stock: product.stock,
      }];
    });
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
    const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
    const timeStr = `${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}`;
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
      };

      // Intentar guardar en backend
      const token = localStorage.getItem('adminToken');
      try {
        const res = await fetch(`${API_URL}/api/quicksales`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(ticketData)
        });
        if (res.ok) {
          const saved = await res.json();
          setLastTicket(saved);
          if (onTicketCreated) onTicketCreated(saved);
        } else {
          // Si falla backend, guardar local
          setLastTicket({ ...ticketData, id: crypto.randomUUID() });
          if (onTicketCreated) onTicketCreated({ ...ticketData, id: crypto.randomUUID() });
        }
      } catch {
        setLastTicket({ ...ticketData, id: crypto.randomUUID() });
        if (onTicketCreated) onTicketCreated({ ...ticketData, id: crypto.randomUUID() });
      }

      onNotify(`Ticket ${ticketNumber} generado - Total: $${total.toFixed(2)}`);
      setShowTicket(true);

    } catch (error) {
      onNotify('Error al generar ticket', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Nuevo ticket (limpiar carrito)
  const newTicket = () => {
    setCart([]);
    setLastTicket(null);
    setShowTicket(false);
    setPaymentMethod('EFECTIVO');
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
              {lastTicket.items?.map((item: any, idx: number) => (
                <tr key={idx} className="border-b border-slate-100 dark:border-slate-700/50">
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
          <button
            onClick={newTicket}
            className="flex-1 py-4 rounded-2xl font-black text-sm uppercase bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-lg"
          >
            Nuevo Ticket
          </button>
          <button
            onClick={() => window.print()}
            className="py-4 px-8 rounded-2xl font-black text-sm uppercase bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            Imprimir
          </button>
        </div>
      </div>
    );
  }

  // Vista principal del POS
  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-3">
            <TicketIcon className="w-8 h-8 text-indigo-500" />
            Caja / Ticket
          </h2>
          <p className="text-sm text-slate-400 font-bold mt-1">Venta rápida sin emisión inmediata al SRI</p>
        </div>
        {cart.length > 0 && (
          <button
            onClick={newTicket}
            className="px-6 py-3 rounded-2xl font-black text-xs uppercase bg-red-50 dark:bg-red-500/10 text-red-600 border border-red-200 dark:border-red-500/20 hover:bg-red-100 transition-colors"
          >
            Cancelar venta
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna izquierda: productos */}
        <div className="lg:col-span-2 space-y-4">
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
                className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-800 rounded-2xl font-bold text-sm outline-none border-2 border-slate-200 dark:border-slate-700 focus:border-indigo-500 transition-colors"
                autoComplete="off"
              />
              {searchTerm && (
                <button onClick={() => { setSearchTerm(''); setShowSearchResults(false); }} className="absolute right-4 top-1/2 -translate-y-1/2">
                  <XMarkIcon className="w-4 h-4 text-slate-400" />
                </button>
              )}
            </div>

            {/* Resultados de búsqueda */}
            {showSearchResults && filteredProducts.length > 0 && (
              <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden max-h-64 overflow-y-auto">
                {filteredProducts.map(product => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors text-left"
                  >
                    <div>
                      <p className="font-bold text-sm text-slate-800 dark:text-white">{product.description}</p>
                      <p className="text-[10px] text-slate-400 font-bold">{product.code} · Stock: {product.stock}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-sm text-indigo-600 dark:text-indigo-400">${product.price.toFixed(2)}</p>
                      <p className="text-[10px] text-slate-400">IVA {product.taxRate}%</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Productos frecuentes */}
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Productos disponibles</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {sellableProducts.filter(p => p.stock > 0 || p.type === 'SERVICIO').slice(0, 12).map(product => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:shadow-md transition-all text-left group"
                >
                  <p className="font-bold text-xs text-slate-800 dark:text-white truncate group-hover:text-indigo-600 transition-colors">
                    {product.description}
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">{product.code}</p>
                  <p className="font-black text-sm text-indigo-600 dark:text-indigo-400 mt-1">${product.price.toFixed(2)}</p>
                  {product.stock <= 5 && product.stock > 0 && (
                    <p className="text-[9px] text-amber-500 font-bold">Quedan {product.stock}</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Columna derecha: carrito y cobro */}
        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm p-6 flex flex-col h-fit">
          <h3 className="font-black text-slate-800 dark:text-white text-lg uppercase tracking-tighter mb-4">
            Ticket actual
          </h3>

          {cart.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
              <TicketIcon className="w-12 h-12 text-slate-200 dark:text-slate-600 mb-3" />
              <p className="text-sm text-slate-400 font-bold">Sin productos</p>
              <p className="text-xs text-slate-300">Busque y seleccione productos</p>
            </div>
          ) : (
            <div className="space-y-3 flex-1 overflow-y-auto max-h-96">
              {cart.map(item => (
                <div key={item.productId} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs text-slate-800 dark:text-white truncate">{item.description}</p>
                    <p className="text-[9px] text-slate-400">${item.unitPrice.toFixed(2)} c/u · IVA {item.taxRate}%</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateQuantity(item.productId, -1)} className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-600 flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-500">
                      <MinusIcon className="w-3 h-3 text-slate-600 dark:text-slate-300" />
                    </button>
                    <span className="w-8 text-center font-black text-sm">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.productId, 1)} className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center hover:bg-indigo-200">
                      <PlusIcon className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                    </button>
                  </div>
                  <p className="font-black text-sm w-16 text-right">${item.total.toFixed(2)}</p>
                  <button onClick={() => removeItem(item.productId)} className="text-slate-300 hover:text-red-500">
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

          {/* Método de pago */}
          <div className="mt-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Forma de pago</p>
            <div className="grid grid-cols-3 gap-1">
              {[
                { value: 'EFECTIVO', label: 'Efectivo', icon: BanknotesIcon },
                { value: 'TARJETA', label: 'Tarjeta', icon: CreditCardIcon },
                { value: 'TRANSFERENCIA', label: 'Transf.', icon: ArrowPathIcon },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setPaymentMethod(opt.value)}
                  className={`p-2 rounded-xl text-[10px] font-black uppercase transition-all flex flex-col items-center gap-1 ${
                    paymentMethod === opt.value
                      ? 'bg-indigo-600 text-white shadow-lg'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                  }`}
                >
                  <opt.icon className="w-4 h-4" />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Botón cobrar */}
          <button
            onClick={handleCharge}
            disabled={cart.length === 0 || isSubmitting}
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
    </div>
  );
};

export default QuickSaleForm;
