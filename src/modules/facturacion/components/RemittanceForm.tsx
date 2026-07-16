import React, { useState, useId } from 'react';
import { TruckIcon, MapPinIcon, PlusIcon, TrashIcon, CubeIcon } from '@heroicons/react/24/outline';
import { RemittanceGuide, RemittanceRecipient, RemittanceItem, BusinessInfo, Client, Product } from '../../../types/types';
import { generateRemittanceXML } from '../../../services/remittanceService';
import { getLocalDateISO } from '../../../utils/date';

interface RemittanceFormProps {
  business: BusinessInfo;
  clients: Client[];
  products: Product[];
  onSubmit: (guide: RemittanceGuide, xml: string) => void;
}

export default function RemittanceForm({ business, clients, products, onSubmit }: RemittanceFormProps) {
  const fieldId = useId();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [originAddress, setOriginAddress] = useState(business.address);
  const [destinationAddress, setDestinationAddress] = useState('');
  const [carrierRuc, setCarrierRuc] = useState('');
  const [carrierName, setCarrierName] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [route, setRoute] = useState('');
  // _key: id estable por fila para las keys de React (las filas se pueden
  // añadir y eliminar, y el índice cambiaría de fila al eliminar).
  const [recipients, setRecipients] = useState<(RemittanceRecipient & { _key?: string })[]>([]);
  const [items, setItems] = useState<(RemittanceItem & { _key?: string })[]>([]);

  const addRecipient = () => {
    setRecipients([...recipients, {
      _key: crypto.randomUUID(),
      ruc: '',
      name: '',
      address: '',
      reasonForTransfer: 'VENTA',
      fiscalDocNumber: '',
      authorizationCode: '',
      fiscalDocDate: ''
    }]);
  };

  const updateRecipient = (index: number, field: keyof RemittanceRecipient, value: string) => {
    const newRecipients = [...recipients];
    newRecipients[index] = { ...newRecipients[index], [field]: value };
    setRecipients(newRecipients);
  };

  const removeRecipient = (index: number) => {
    setRecipients(recipients.filter((_, i) => i !== index));
  };

  const selectClientForRecipient = (index: number, clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      updateRecipient(index, 'ruc', client.ruc);
      updateRecipient(index, 'name', client.name);
      updateRecipient(index, 'address', client.address);
    }
  };

  const addItem = () => {
    setItems([...items, {
      _key: crypto.randomUUID(),
      productCode: '',
      description: '',
      quantity: 1,
      additionalDetail: ''
    }]);
  };

  const updateItem = (index: number, field: keyof RemittanceItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const selectProduct = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      updateItem(index, 'productCode', product.code);
      updateItem(index, 'description', product.description);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!startDate || !endDate || !carrierRuc || !carrierName || !licensePlate || recipients.length === 0 || items.length === 0) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }

    // El número secuencial lo asigna el backend
    const number = '';

    const guide: RemittanceGuide = {
      id: Date.now().toString(),
      number: '', // El backend asigna el número
      accessKey: '', // Se genera en el XML
      issueDate: getLocalDateISO(),
      startDate,
      endDate,
      originAddress,
      destinationAddress: recipients[0]?.address || destinationAddress,
      carrierRuc,
      carrierName,
      licensePlate: licensePlate.toUpperCase(),
      establishmentCode: business.establishmentCode,
      emissionPointCode: business.emissionPointCode,
      recipients,
      items,
      status: 'PENDIENTE' as any,
      route
    };

    const xml = generateRemittanceXML(guide, business);

    onSubmit(guide, xml);
  };
  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <TruckIcon className="w-10 h-10 text-slate-700 dark:text-slate-300" />
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Nueva Guía de Remisión</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información del Transporte */}
          <div className="border-b border-gray-100 dark:border-slate-700/50 pb-4">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-slate-200 mb-4 flex items-center gap-2">
              <TruckIcon className="w-5 h-5" />
              Información del Transporte
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor={`${fieldId}-startDate`} className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Fecha Inicio Transporte *
                </label>
                <input
                  id={`${fieldId}-startDate`}
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-900/50 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-550"
                />
              </div>

              <div>
                <label htmlFor={`${fieldId}-endDate`} className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Fecha Fin Transporte *
                </label>
                <input
                  id={`${fieldId}-endDate`}
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-900/50 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-550"
                />
              </div>

              <div>
                <label htmlFor={`${fieldId}-originAddress`} className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Dirección de Partida *
                </label>
                <input
                  id={`${fieldId}-originAddress`}
                  type="text"
                  value={originAddress}
                  onChange={(e) => setOriginAddress(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-900/50 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-550"
                />
              </div>

              <div>
                <label htmlFor={`${fieldId}-route`} className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Ruta
                </label>
                <input
                  id={`${fieldId}-route`}
                  type="text"
                  value={route}
                  onChange={(e) => setRoute(e.target.value)}
                  placeholder="Ej: Guayaquil - Samborondón"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-900/50 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-550"
                />
              </div>
            </div>
          </div>

          {/* Información del Transportista */}
          <div className="border-b border-gray-100 dark:border-slate-700/50 pb-4">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-slate-200 mb-4">Transportista</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor={`${fieldId}-carrierRuc`} className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  RUC del Transportista *
                </label>
                <input
                  id={`${fieldId}-carrierRuc`}
                  type="text"
                  value={carrierRuc}
                  onChange={(e) => setCarrierRuc(e.target.value)}
                  placeholder="1234567890001"
                  maxLength={13}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-900/50 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-550"
                />
              </div>

              <div>
                <label htmlFor={`${fieldId}-carrierName`} className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Nombre del Transportista *
                </label>
                <input
                  id={`${fieldId}-carrierName`}
                  type="text"
                  value={carrierName}
                  onChange={(e) => setCarrierName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-900/50 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-550"
                />
              </div>

              <div>
                <label htmlFor={`${fieldId}-licensePlate`} className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Placa del Vehículo *
                </label>
                <input
                  id={`${fieldId}-licensePlate`}
                  type="text"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                  placeholder="ABC-1234"
                  maxLength={8}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-900/50 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-550"
                />
              </div>
            </div>
          </div>

          {/* Destinatarios */}
          <div className="border-b border-gray-100 dark:border-slate-700/50 pb-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-700 dark:text-slate-200 flex items-center gap-2">
                <MapPinIcon className="w-5 h-5" />
                Destinatarios
              </h3>
              <button
                type="button"
                onClick={addRecipient}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
              >
                <PlusIcon className="w-5 h-5" />
                Agregar Destinatario
              </button>
            </div>

            {recipients.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 dark:bg-slate-900/30 border border-dashed border-gray-200 dark:border-slate-700 rounded-lg">
                <p className="text-gray-500 dark:text-slate-400">No hay destinatarios. Haga clic en "Agregar Destinatario"</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recipients.map((recipient, index) => (
                  <div key={recipient._key} className="border border-gray-250 dark:border-slate-700 rounded-lg p-4 bg-gray-50 dark:bg-slate-900/30">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="font-medium text-gray-700 dark:text-slate-300">Destinatario {index + 1}</h4>
                      <button
                        type="button"
                        aria-label="Eliminar destinatario"
                        onClick={() => removeRecipient(index)}
                        className="text-red-655 hover:text-red-800 text-lg"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label htmlFor={`${fieldId}-rec-client-${index}`} className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                          Seleccionar Cliente
                        </label>
                        <select
                          id={`${fieldId}-rec-client-${index}`}
                          onChange={(e) => selectClientForRecipient(index, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-gray-800 dark:text-white"
                        >
                          <option value="" className="dark:bg-slate-800">Seleccione o ingrese manualmente</option>
                          {(Array.isArray(clients) ? clients : []).map(client => (
                            <option key={client.id} value={client.id} className="dark:bg-slate-800">
                              {client.name} - {client.ruc}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor={`${fieldId}-rec-ruc-${index}`} className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                          RUC
                        </label>
                        <input
                          id={`${fieldId}-rec-ruc-${index}`}
                          type="text"
                          value={recipient.ruc}
                          onChange={(e) => updateRecipient(index, 'ruc', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-gray-800 dark:text-white"
                        />
                      </div>

                      <div>
                        <label htmlFor={`${fieldId}-rec-name-${index}`} className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                          Nombre
                        </label>
                        <input
                          id={`${fieldId}-rec-name-${index}`}
                          type="text"
                          value={recipient.name}
                          onChange={(e) => updateRecipient(index, 'name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-gray-800 dark:text-white"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label htmlFor={`${fieldId}-rec-address-${index}`} className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                          Dirección
                        </label>
                        <input
                          id={`${fieldId}-rec-address-${index}`}
                          type="text"
                          value={recipient.address}
                          onChange={(e) => updateRecipient(index, 'address', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-gray-800 dark:text-white"
                        />
                      </div>

                      <div>
                        <label htmlFor={`${fieldId}-rec-reason-${index}`} className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                          Motivo del Traslado
                        </label>
                        <select
                          id={`${fieldId}-rec-reason-${index}`}
                          value={recipient.reasonForTransfer}
                          onChange={(e) => updateRecipient(index, 'reasonForTransfer', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-gray-800 dark:text-white"
                        >
                          <option value="VENTA" className="dark:bg-slate-800">Venta</option>
                          <option value="TRANSFORMACION" className="dark:bg-slate-800">Transformación</option>
                          <option value="DEVOLUCION" className="dark:bg-slate-800">Devolución</option>
                          <option value="TRASLADO" className="dark:bg-slate-800">Traslado entre establecimientos</option>
                          <option value="EXPORTACION" className="dark:bg-slate-800">Exportación</option>
                          <option value="IMPORTACION" className="dark:bg-slate-800">Importación</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor={`${fieldId}-rec-fiscalDoc-${index}`} className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                          Número Documento Fiscal
                        </label>
                        <input
                          id={`${fieldId}-rec-fiscalDoc-${index}`}
                          type="text"
                          value={recipient.fiscalDocNumber || ''}
                          onChange={(e) => updateRecipient(index, 'fiscalDocNumber', e.target.value)}
                          placeholder="001-001-000001234"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-550"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Productos */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-700 dark:text-slate-200 flex items-center gap-2">
                <CubeIcon className="w-5 h-5" />
                Productos a Transportar
              </h3>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
              >
                <PlusIcon className="w-5 h-5" />
                Agregar Producto
              </button>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 dark:bg-slate-900/30 border border-dashed border-gray-200 dark:border-slate-700 rounded-lg">
                <p className="text-gray-500 dark:text-slate-400">No hay productos. Haga clic en "Agregar Producto"</p>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={item._key} className="border border-gray-250 dark:border-slate-700 rounded-lg p-4 bg-gray-50 dark:bg-slate-900/30">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="font-medium text-gray-700 dark:text-slate-300">Producto {index + 1}</h4>
                      <button
                        type="button"
                        aria-label="Eliminar producto"
                        onClick={() => removeItem(index)}
                        className="text-red-655 hover:text-red-800 text-lg"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label htmlFor={`${fieldId}-item-product-${index}`} className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                          Seleccionar Producto
                        </label>
                        <select
                          id={`${fieldId}-item-product-${index}`}
                          onChange={(e) => selectProduct(index, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-gray-800 dark:text-white"
                        >
                          <option value="" className="dark:bg-slate-800">Seleccione o ingrese manualmente</option>
                          {(Array.isArray(products) ? products : []).map(product => (
                            <option key={product.id} value={product.id} className="dark:bg-slate-800">
                              {product.code} - {product.description}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor={`${fieldId}-item-code-${index}`} className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                          Código
                        </label>
                        <input
                          id={`${fieldId}-item-code-${index}`}
                          type="text"
                          value={item.productCode}
                          onChange={(e) => updateItem(index, 'productCode', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-gray-800 dark:text-white"
                        />
                      </div>

                      <div>
                        <label htmlFor={`${fieldId}-item-qty-${index}`} className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                          Cantidad
                        </label>
                        <input
                          id={`${fieldId}-item-qty-${index}`}
                          type="number"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-gray-800 dark:text-white"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label htmlFor={`${fieldId}-item-desc-${index}`} className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                          Descripción
                        </label>
                        <input
                          id={`${fieldId}-item-desc-${index}`}
                          type="text"
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900/50 text-gray-800 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Botones */}
          <div className="flex gap-4 justify-end">
            <button
              type="button"
              className="px-6 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-semibold"
            >
              Emitir Guía de Remisión
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
