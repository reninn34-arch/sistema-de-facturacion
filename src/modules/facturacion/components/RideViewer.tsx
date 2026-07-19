
import React, { useEffect, useState } from 'react';
import { Document, BusinessInfo, InvoiceItem } from '../../../types/types';
import QRCode from 'qrcode';
import { DocumentTextIcon, PrinterIcon, BuildingOffice2Icon } from '@heroicons/react/24/outline';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface RideViewerProps {
  document: Document;
  businessInfo: BusinessInfo;
  items: InvoiceItem[];
  onClose: () => void;
}

const RideViewer: React.FC<RideViewerProps> = ({ document, businessInfo, items, onClose }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    // Generar código QR con la clave de acceso
    if (document.accessKey) {
      QRCode.toDataURL(document.accessKey, {
        width: 200,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      }).then(url => {
        setQrCodeUrl(url);
      }).catch(err => {
        console.error('Error generando QR:', err);
      });
    }
  }, [document.accessKey]);

  const handlePrint = () => {
    const rideEl = window.document.getElementById('ride-content');
    if (!rideEl) return;

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      alert('El navegador bloqueó la ventana de impresión. Permita ventanas emergentes.');
      return;
    }

    const content = rideEl.cloneNode(true) as HTMLElement;
    const controls = content.querySelector('.print\\:hidden');
    if (controls) controls.remove();

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>RIDE - ${document.number}</title>
        <script src="https://cdn.tailwindcss.com"><\/script>
        <style>
          * { box-sizing: border-box; }
          body { 
            margin: 0; padding: 20px 24px;
            font-family: serif;
            background: white;
            color: #1e293b;
          }
          @media print {
            @page { size: A4; margin: 10mm; }
            body { margin: 0; padding: 0; }
          }
          .print\\:hidden { display: none !important; }
        </style>
      </head>
      <body>${content.outerHTML}</body>
      </html>
    `);
    printWindow.document.close();

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 400);
    };
  };

  const handleDownloadPDF = async () => {
    setIsGeneratingPdf(true);
    try {
      if (!items || items.length === 0) {
        alert('No hay productos para incluir en el PDF.');
        setIsGeneratingPdf(false);
        return;
      }

      let qrBase64 = '';
      if (document.accessKey) {
        try {
          qrBase64 = await QRCode.toDataURL(document.accessKey, {
            margin: 1, width: 160,
            color: { dark: '#000000', light: '#ffffff' }
          });
        } catch { /* sin QR */ }
      }

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const sub15 = items.reduce((a, b) => b.taxRate > 0 ? a + (b.quantity * b.unitPrice - (b.discount || 0)) : a, 0);
      const sub0 = items.reduce((a, b) => b.taxRate === 0 ? a + (b.quantity * b.unitPrice - (b.discount || 0)) : a, 0);
      const iva = items.reduce((a, b) => b.taxRate > 0 ? a + ((b.quantity * b.unitPrice - (b.discount || 0)) * (b.taxRate / 100)) : a, 0);
      const desc = items.reduce((a, b) => a + (b.discount || 0), 0);
      const total = sub15 + sub0 + iva;

      let y = 15;

      pdf.setDrawColor(0);
      pdf.setLineWidth(0.5);
      pdf.rect(10, y, 90, 40);
      pdf.rect(100, y, 100, 40);

      let logoRightEdge = 12;
      if (businessInfo.logo) {
        try {
          const imgProps = pdf.getImageProperties(businessInfo.logo);
          const aspectRatio = imgProps.width / imgProps.height;
          const maxH = 36;
          const maxW = 55;
          let lw: number, lh: number;
          if (aspectRatio > 1) { lw = Math.min(maxW, maxH * aspectRatio); lh = lw / aspectRatio; }
          else { lh = maxH; lw = lh * aspectRatio; }
          pdf.addImage(businessInfo.logo, 'PNG', 12, y + 6, lw, lh);
          logoRightEdge = 12 + lw + 3;
        } catch { /* logo falló */ }
      }
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text(businessInfo.name, logoRightEdge, y + 10, { maxWidth: 88 - logoRightEdge });
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Dir: ${businessInfo.address}`, 12, y + 20, { maxWidth: 86 });
      pdf.text(`RUC: ${businessInfo.ruc}`, 12, y + 26);
      pdf.text(`Obligado contabilidad: ${businessInfo.isAccountingObliged ? 'SI' : 'NO'}`, 12, y + 32);

      const isProforma = (document as any).type === '00';
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text(isProforma ? 'PROFORMA' : 'FACTURA', 150, y + 10, { align: 'center' });
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`No. ${document.number}`, 150, y + 16, { align: 'center' });
      pdf.setFontSize(7);
      pdf.text(`Clave: ${document.accessKey}`, 102, y + 24, { maxWidth: 96 });
      pdf.text(`Fecha: ${document.issueDate || new Date().toLocaleDateString()}`, 102, y + 32);

      y += 48;

      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.text('DATOS DEL CLIENTE', 12, y);
      y += 5;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.text(`Razon Social: ${document.entityName}`, 12, y);
      pdf.text(`RUC/CI: ${document.entityRuc || '9999999999'}`, 100, y);
      y += 5;
      pdf.text(`Email: ${document.entityEmail || 'N/A'}`, 12, y);
      pdf.text(`Direccion: ${document.entityAddress || 'N/A'}`, 100, y);

      y += 10;

      const rows = items.map((it, i) => [
        `ITM-${i + 1}`,
        String(it.quantity),
        it.description,
        `$${it.unitPrice.toFixed(2)}`,
        `$${(it.discount || 0).toFixed(2)}`,
        `$${(it.quantity * it.unitPrice - (it.discount || 0)).toFixed(2)}`
      ]);

      autoTable(pdf, {
        startY: y,
        head: [['Cod', 'Cant', 'Descripcion', 'P.Unit', 'Desc', 'Total']],
        body: rows,
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: 'bold' },
      });

      y = (pdf as any).lastAutoTable.finalY + 8;

      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`SUBTOTAL 15%:`, 12, y);
      pdf.text(`$${sub15.toFixed(2)}`, 60, y, { align: 'right' });
      pdf.text(`SUBTOTAL 0%:`, 80, y);
      pdf.text(`$${sub0.toFixed(2)}`, 128, y, { align: 'right' });
      y += 5;
      pdf.text(`SUBTOTAL SIN IMPUESTOS:`, 12, y);
      pdf.text(`$${(sub15 + sub0).toFixed(2)}`, 60, y, { align: 'right' });
      pdf.text(`DESCUENTO:`, 80, y);
      pdf.text(`$${desc.toFixed(2)}`, 128, y, { align: 'right' });
      y += 5;
      pdf.text(`IVA 15%:`, 12, y);
      pdf.text(`$${iva.toFixed(2)}`, 60, y, { align: 'right' });
      y += 5;
      pdf.setFontSize(9);
      pdf.text(`VALOR TOTAL:`, 12, y);
      pdf.text(`$${total.toFixed(2)}`, 60, y, { align: 'right' });

      if (qrBase64) {
        pdf.addImage(qrBase64, 'PNG', 120, y - 10, 30, 30);
        pdf.setFontSize(6);
        pdf.text('Escanee para verificar', 135, y + 22, { align: 'center' });
      }

      const label = isProforma ? 'proforma' : 'factura';
      pdf.save(`${label}_${String(document.number).replace(/-/g, '_')}.pdf`);
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF. Use el boton Imprimir y seleccione "Guardar como PDF".');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Cálculos basados en la normativa del SRI. Redondeo por línea + agregado con
  // el mismo criterio que buildInvoiceXml para que el RIDE cuadre al centavo.
  const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
  const subtotal15 = round2(items.reduce((acc, item) =>
    item.taxRate > 0 ? acc + round2(item.quantity * item.unitPrice - (item.discount || 0)) : acc, 0
  ));

  const subtotal0 = round2(items.reduce((acc, item) =>
    item.taxRate === 0 ? acc + round2(item.quantity * item.unitPrice - (item.discount || 0)) : acc, 0
  ));

  const totalDiscount = round2(items.reduce((acc, item) => acc + (item.discount || 0), 0));

  const totalIva = round2(subtotal15 * 0.15);

  const finalTotal = round2(subtotal15 + subtotal0 + totalIva);

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[300] overflow-y-auto">
      {/* Estilos inyectados específicamente para impresión */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: A4; margin: 10mm; }
          body { background: white !important; }
        }
      `}} />

      {/* Contenedor con scroll mejorado */}
      <div className="min-h-screen flex items-start justify-center py-8 px-4">
        <div className="print-container bg-white w-full max-w-[210mm] shadow-2xl rounded-xl overflow-hidden">
          {/* Header de controles (No se imprime) - FIXED al top */}
          <div className="sticky top-0 z-10 bg-white shadow-md flex justify-between items-center px-6 py-4 border-b border-slate-200 print:hidden">
            <div className="flex items-center gap-4">
              <button type="button" 
                onClick={onClose} 
                className="flex items-center gap-2 px-4 py-2 hover:bg-slate-100 rounded-xl transition-all font-semibold text-slate-700"
              >
                <span className="text-xl">✕</span> Cerrar
              </button>
              <h2 className="font-black text-slate-800 uppercase tracking-tight text-lg">RIDE - Factura Electrónica</h2>
            </div>
            <div className="flex gap-3">
              <button type="submit" 
                onClick={handleDownloadPDF}
                disabled={isGeneratingPdf}
                className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-wide shadow-lg shadow-red-200 hover:bg-red-700 hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isGeneratingPdf ? (
                  <>
                    <svg className="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Generando PDF...
                  </>
                ) : (
                  <>
                    <DocumentTextIcon className="w-5 h-5" /> Guardar PDF
                  </>
                )}
              </button>
              <button type="button" 
                onClick={handlePrint}
                className="flex items-center gap-2 bg-sky-500 text-white px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-wide shadow-lg shadow-sky-200 hover:bg-sky-600 hover:scale-105 transition-all"
              >
                <PrinterIcon className="w-5 h-5" /> Imprimir
              </button>
            </div>
          </div>

          {/* Contenido del RIDE */}
          <div id="ride-content" className="p-4 md:p-6 print:p-0">
            <div className="flex flex-col gap-2 text-[9px] text-slate-800 leading-tight font-serif print:text-[9pt]">
              <div className="grid grid-cols-2 gap-2">
            {/* Bloque Izquierdo: Emisor */}
            <div className="border border-slate-300 p-2 rounded-lg flex flex-col items-center justify-center space-y-2 text-center">
              {businessInfo.logo ? (
                <img src={businessInfo.logo} className="max-h-32 object-contain" alt="Logo" />
              ) : (
                <div className="w-12 h-12 bg-slate-100 flex items-center justify-center rounded-xl"><BuildingOffice2Icon className="w-6 h-6 text-slate-400" /></div>
              )}
              <div className="space-y-0.5">
                <p className="font-bold text-sm uppercase leading-tight">{businessInfo.name}</p>
                <p>Dirección Matriz: {businessInfo.address}</p>
                <p className="font-bold">{businessInfo.regime}</p>
                <p>OBLIGADO A LLEVAR CONTABILIDAD: NO</p>
              </div>
            </div>

            {/* Bloque Derecho: Info Fiscal */}
            <div className="border border-slate-300 p-2 rounded-lg space-y-1">
              <p className="font-bold text-base">R.U.C.: {businessInfo.ruc}</p>
              <p className="bg-slate-100 p-1 font-bold text-center border border-slate-200 text-sm">FACTURA</p>
              <p>No. {document.number}</p>
              <p className="font-bold">NÚMERO DE AUTORIZACIÓN:</p>
              <p className="text-[8px] break-all font-mono leading-none">{document.accessKey}</p>
              <p>FECHA Y HORA DE AUTORIZACIÓN: {new Date().toLocaleString()}</p>
              <p>AMBIENTE: {businessInfo.isProduction ? 'PRODUCCIÓN' : 'PRUEBAS'}</p>
              <p>EMISIÓN: NORMAL</p>
              <p className="font-bold">CLAVE DE ACCESO:</p>
              <div className="bg-slate-50 p-2 border border-slate-200 text-center font-mono tracking-tighter text-[8px]">
                {document.accessKey}
              </div>
            </div>
          </div>

          {/* Info Cliente */}
          <div className="border border-slate-300 p-2 rounded-lg space-y-1">
            <p><span className="font-bold">Razón Social / Nombres y Apellidos:</span> {document.entityName}</p>
            <p><span className="font-bold">Identificación:</span> {document.entityPhone || '9999999999'}</p>
            <p><span className="font-bold">Fecha Emisión:</span> {document.issueDate}</p>
          </div>

          {/* Tabla de Productos */}
          <table className="w-full border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-50">
                <th className="border border-slate-300 p-1 text-left text-[8px]">Cod. Principal</th>
                <th className="border border-slate-300 p-1 text-center text-[8px]">Cant.</th>
                <th className="border border-slate-300 p-1 text-left text-[8px]">Descripción</th>
                <th className="border border-slate-300 p-1 text-right text-[8px]">P. Unitario</th>
                <th className="border border-slate-300 p-1 text-right text-[8px]">Descuento</th>
                <th className="border border-slate-300 p-1 text-right text-[8px]">Precio Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={`${it.productId}-${it.description}`}>
                  <td className="p-1 border border-slate-300 text-[8px]">ITM-{idx+1}</td>
                  <td className="p-1 border border-slate-300 text-center text-[8px]">{it.quantity}</td>
                  <td className="p-1 border border-slate-300 text-[8px]">{it.description}</td>
                  <td className="p-1 border border-slate-300 text-right text-[8px]">${it.unitPrice.toFixed(2)}</td>
                  <td className="p-1 border border-slate-300 text-right text-[8px]">${it.discount.toFixed(2)}</td>
                  <td className="p-1 border border-slate-300 text-right font-bold text-[8px]">${(it.quantity * it.unitPrice - it.discount).toFixed(2)}</td>
                </tr>
              ))}
              {/* Rellenar espacios si hay pocos items para mantener estructura SRI */}
              {items.length < 2 && Array.from({ length: 2 - items.length }).map((_, i) => (
                <tr key={`empty-${i}`} className="h-4">
                  <td className="border border-slate-300"></td><td className="border border-slate-300"></td>
                  <td className="border border-slate-300"></td><td className="border border-slate-300"></td>
                  <td className="border border-slate-300"></td><td className="border border-slate-300"></td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer: Adicionales y Totales */}
          <div className="grid grid-cols-2 gap-2 no-break">
            <div className="border border-slate-300 p-2 rounded-lg h-fit space-y-2">
              <p className="font-bold text-[8px] border-b pb-0.5">Información Adicional</p>
              <p className="text-[8px]">Email: {document.entityEmail || 'S/N'}</p>
              <div className="pt-1 mt-1 border-t border-slate-200">
                <p className="font-bold text-[8px] mb-1 uppercase">Forma de Pago</p>
                <div className="flex justify-between text-[7px] border border-slate-200 p-1">
                  <span>OTROS CON UTILIZACION DEL SISTEMA FINANCIERO</span>
                  <span className="font-bold">${finalTotal.toFixed(2)}</span>
                </div>
              </div>
              
              {/* Código QR */}
              {qrCodeUrl && (
                <div className="no-break qr-code pt-1 mt-1 border-t border-slate-200 flex flex-col items-center">
                  <p className="font-bold text-[7px] mb-1 uppercase text-center">Código QR</p>
                  <img src={qrCodeUrl} alt="Código QR" className="w-24 h-24" />
                  <p className="text-[6px] text-slate-500 text-center mt-0.5">Escanea para verificar</p>
                </div>
              )}
            </div>

            <div className="border border-slate-300 rounded-lg overflow-hidden h-fit">
              <table className="w-full text-[8px] print:text-[8pt]">
                <tbody className="divide-y divide-slate-200">
                  <tr><td className="p-1 font-bold">SUBTOTAL 15%</td><td className="p-1 text-right">${subtotal15.toFixed(2)}</td></tr>
                  <tr><td className="p-1 font-bold">SUBTOTAL 0%</td><td className="p-1 text-right">${subtotal0.toFixed(2)}</td></tr>
                  <tr><td className="p-1 font-bold">SUBTOTAL SIN IMPUESTOS</td><td className="p-1 text-right">${(subtotal15 + subtotal0).toFixed(2)}</td></tr>
                  <tr><td className="p-1 font-bold">DESCUENTO</td><td className="p-1 text-right">${totalDiscount.toFixed(2)}</td></tr>
                  <tr><td className="p-1 font-bold text-sky-500">IVA 15%</td><td className="p-1 text-right">${totalIva.toFixed(2)}</td></tr>
                  <tr className="bg-slate-100 font-bold text-[9px]"><td className="p-1.5">VALOR TOTAL</td><td className="p-1.5 text-right">${finalTotal.toFixed(2)}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-auto pt-2 text-[7px] text-center text-slate-400 italic">
            Este es un documento electrónico autorizado por el SRI del Ecuador. Para consultar la validez de este comprobante puede ingresar al portal web del SRI.
          </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RideViewer;
