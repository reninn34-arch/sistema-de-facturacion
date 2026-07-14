
import React, { useState, useRef, useEffect, useMemo, useId } from 'react';
import { Client, Product, InvoiceItem, SriStatus, DocumentType, Document, PaymentStatus, BusinessInfo, NotificationSettings, EmissionPoint, ReimbursementDetail, ExportDetails } from '../../../types/types';
import { SRI_PAYMENT_METHODS } from '../../../constants';
import { generateAccessKey } from '../../../utils/sri';
import { buildInvoiceXml, authorizeWithSRI } from '../../../services/sriService';
import { getLocalDateISO } from '../../../utils/date';
import { validateEcuadorianId } from '../../../utils/validation';
import RideViewer from './RideViewer';
import { DocumentTextIcon, PrinterIcon, EnvelopeIcon, MagnifyingGlassIcon, CubeIcon, Cog6ToothIcon, ShoppingCartIcon, BuildingOffice2Icon } from '@heroicons/react/24/outline';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface InvoiceFormProps {
  clients: Client[];
  setClients?: React.Dispatch<React.SetStateAction<Client[]>>;
  isDemoMode?: boolean;
  products: Product[];
  businessInfo: BusinessInfo;
  signatureFile: File | null;
  signaturePassword: string;
  notificationSettings: NotificationSettings;
  onNotify: (msg: string, type?: any) => void;
  onAuthorize: (doc: Document, items: InvoiceItem[]) => void;
  emissionPoints?: EmissionPoint[];
  selectedEmissionPoint?: EmissionPoint | null;
  onSelectEmissionPoint?: (point: EmissionPoint | null) => void;
  preloadRejected?: Document | null;
  onClearPreload?: () => void;
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({ clients, setClients, isDemoMode, products, businessInfo, signatureFile, signaturePassword, notificationSettings, onNotify, onAuthorize, emissionPoints, selectedEmissionPoint, onSelectEmissionPoint, preloadRejected, onClearPreload }) => {
  // Detectar modo oscuro
  const isDarkMode = (businessInfo as any)?.features?.isDarkMode ?? false;
  const API_URL = import.meta.env.VITE_BACKEND_URL || '';

  const fieldId = useId();
  const [isNewClient, setIsNewClient] = useState(false);
  const [newClientData, setNewClientData] = useState({ ruc: '', name: '', email: '', phone: '', address: '' });

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('01');
  const [priceTier, setPriceTier] = useState<'price' | 'wholesalePrice' | 'distributorPrice'>('price');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authStep, setAuthStep] = useState('');
  const [authLogs, setAuthLogs] = useState<{ id: string; text: string }[]>([]);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const [additionalInfo, setAdditionalInfo] = useState('');
  const [tip, setTip] = useState(0);
  const [customEmail, setCustomEmail] = useState('');
  const [customPhone, setCustomPhone] = useState('');
  const [invoiceType, setInvoiceType] = useState('Factura Simple');
  const [discountType, setDiscountType] = useState<'TOTAL' | 'PRODUCT'>('TOTAL');
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [reimbursementTab, setReimbursementTab] = useState<'PRODUCTO' | 'REEMBOLSO'>('PRODUCTO');
  const [reimbursements, setReimbursements] = useState<ReimbursementDetail[]>([]);
  const [showReimbursementForm, setShowReimbursementForm] = useState(false);
  const [reimbursementForm, setReimbursementForm] = useState<Partial<ReimbursementDetail>>({
    tipoIdentificacionProveedorReembolso: '04',
    tipoProveedorReembolso: '01',
    codDocReembolso: '01',
    baseImponibleSinIva: 0,
    baseImponibleConIva: 0,
    impuestoReembolso: 0
  });
  const [exportDetails, setExportDetails] = useState({
    comercioExterior: 'EXPORTADOR',
    lugarIncoterm: '',
    puertoEmbarque: '',
    puertoDestino: '',
    incoTermTotalSinImpuestos: '',
    incoTermFactura: '',
    paisOrigen: 'ECUADOR',
    paisAdquisicion: '',
    paisDestino: ''
  });

  const [lastDocument, setLastDocument] = useState<Document | null>(null);
  const [showRide, setShowRide] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [isProforma, setIsProforma] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);

  // Función auxiliar para generar PDF en Base64
  const generatePdfBase64 = async (doc: Document, docItems: InvoiceItem[]): Promise<string | null> => {
    try {
      console.log('🔄 Iniciando generación de PDF...');
      console.log('📦 Items a incluir:', docItems.length);
      
      if (!docItems || docItems.length === 0) {
        console.error('❌ No hay items para incluir en el PDF');
        return null;
      }
      
      console.log('🔄 Importando QRCode...');
      const QRCode = await import('qrcode');
      console.log('✅ QRCode importado');
      
      // Generar QR como imagen base64
      console.log('🔄 Generando código QR para:', doc.accessKey);
      const qrCodeDataUrl = await QRCode.toDataURL(doc.accessKey, { 
        margin: 1, 
        width: 200, 
        color: { dark: '#000000', light: '#ffffff' } 
      });
      console.log('✅ Código QR generado, longitud:', qrCodeDataUrl.length);

      // Crear PDF (jsPDF ya está importado estáticamente)
      console.log('🔄 Creando documento PDF...');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      console.log('✅ Documento PDF creado');
      
      // Verificar que autoTable esté disponible
      if (typeof autoTable !== 'function') {
        console.error('❌ ERROR: autoTable no está importado correctamente!');
        return null;
      } else {
        console.log('✅ autoTable está disponible como función');
      }

      // Calcular totales
      const pdfSub15 = docItems.reduce((a, b) => b.taxRate > 0 ? a + (b.quantity * b.unitPrice - (b.discount || 0)) : a, 0);
      const pdfSub0 = docItems.reduce((a, b) => b.taxRate === 0 ? a + (b.quantity * b.unitPrice - (b.discount || 0)) : a, 0);
      const pdfTax = docItems.reduce((a, b) => b.taxRate > 0 ? a + ((b.quantity * b.unitPrice - (b.discount || 0)) * (b.taxRate / 100)) : a, 0);
      const totalDiscount = docItems.reduce((acc, item) => acc + (item.discount || 0), 0);

      console.log('💰 Totales calculados:', { 
        sub15: pdfSub15.toFixed(2), 
        sub0: pdfSub0.toFixed(2), 
        tax: pdfTax.toFixed(2), 
        discount: totalDiscount.toFixed(2),
        total: doc.total.toFixed(2)
      });

      let yPos = 15;

      // SECCIÓN 1: Información de la empresa y autorización (lado a lado)
      // Cuadro izquierdo: Datos de la empresa
      pdf.setDrawColor(0);
      pdf.setLineWidth(0.5);
      pdf.rect(10, yPos, 90, 40);
      
      // Agregar logo si existe
      if (businessInfo.logo) {
        try {
          console.log('🔄 Agregando logo al PDF...');
          
          // Obtener dimensiones de la imagen para mantener proporciones
          const imgProps = pdf.getImageProperties(businessInfo.logo);
          const imgWidth = imgProps.width;
          const imgHeight = imgProps.height;
          const aspectRatio = imgWidth / imgHeight;
          
          // Definir tamaño máximo y calcular dimensiones proporcionales
          const maxLogoHeight = 40;
          const maxLogoWidth = 60;
          
          let logoWidth, logoHeight;
          if (aspectRatio > 1) {
            // Imagen horizontal
            logoWidth = Math.min(maxLogoWidth, maxLogoHeight * aspectRatio);
            logoHeight = logoWidth / aspectRatio;
          } else {
            // Imagen vertical o cuadrada
            logoHeight = maxLogoHeight;
            logoWidth = logoHeight * aspectRatio;
          }
          
          console.log(`📐 Logo dimensions: ${logoWidth.toFixed(2)}x${logoHeight.toFixed(2)}mm (aspect ratio: ${aspectRatio.toFixed(2)})`);
          
          pdf.addImage(businessInfo.logo, 'PNG', 12, yPos + 5, logoWidth, logoHeight);
          console.log('✅ Logo agregado');
          
          // Texto al lado del logo
          const textStartX = 12 + logoWidth + 3; // Logo + margen
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'bold');
          
          // Dividir el nombre si es muy largo
          const maxWidth = 90 - textStartX - 2;
          const nameLines = pdf.splitTextToSize(businessInfo.name, maxWidth);
          let textY = yPos + 8;
          nameLines.forEach((line: string) => {
            pdf.text(line, textStartX, textY);
            textY += 4;
          });
          
          // Información adicional debajo del logo
          pdf.setFontSize(7);
          pdf.setFont('helvetica', 'normal');
          const infoY = yPos + 22;
          pdf.text(`Dirección: ${businessInfo.address}`, 12, infoY, { maxWidth: 86 });
          pdf.text(`RUC: ${businessInfo.ruc}`, 12, infoY + 7);
          
          const accountingText = businessInfo.isAccountingObliged ? 'SI' : 'NO';
          pdf.text(`Obligado a llevar contabilidad: ${accountingText}`, 12, infoY + 12);
        } catch (error) {
          console.error('⚠️ Error agregando logo:', error);
          // Si falla el logo, continuar sin él
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'bold');
          const nameLines = pdf.splitTextToSize(businessInfo.name, 86);
          let textY = yPos + 7;
          nameLines.forEach((line: string) => {
            pdf.text(line, 12, textY);
            textY += 4;
          });
          
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'normal');
          pdf.text(`Dirección: ${businessInfo.address}`, 12, yPos + 20, { maxWidth: 86 });
          pdf.text(`RUC: ${businessInfo.ruc}`, 12, yPos + 28);
          const accountingText = businessInfo.isAccountingObliged ? 'SI' : 'NO';
          pdf.text(`Obligado a llevar contabilidad: ${accountingText}`, 12, yPos + 34);
        }
      } else {
        // Sin logo - diseño centrado con texto ajustado
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        const nameLines = pdf.splitTextToSize(businessInfo.name, 86);
        let textY = yPos + 7;
        nameLines.forEach((line: string) => {
          pdf.text(line, 12, textY);
          textY += 4;
        });
        
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Dirección: ${businessInfo.address}`, 12, yPos + 20, { maxWidth: 86 });
        pdf.text(`RUC: ${businessInfo.ruc}`, 12, yPos + 28);
        const accountingText = businessInfo.isAccountingObliged ? 'SI' : 'NO';
        pdf.text(`Obligado a llevar contabilidad: ${accountingText}`, 12, yPos + 34);
      }

      // Cuadro derecho: Datos de autorización
      pdf.rect(105, yPos, 95, 40);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`R.U.C.: ${businessInfo.ruc}`, 150, yPos + 7, { align: 'center' });
      pdf.text('FACTURA', 150, yPos + 12, { align: 'center' });
      
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`No. ${doc.number}`, 107, yPos + 17);
      pdf.text('CLAVE DE ACCESO', 107, yPos + 21);
      pdf.setFontSize(7);
      pdf.text(doc.accessKey, 107, yPos + 25);
      pdf.setFontSize(8);
      pdf.text('FECHA Y HORA DE AUTORIZACIÓN', 107, yPos + 29);
      pdf.text(new Date().toLocaleString(), 107, yPos + 33);
      pdf.text(`AMBIENTE: ${businessInfo.isProduction ? 'PRODUCCIÓN' : 'PRUEBAS'}`, 107, yPos + 37);

      yPos += 45;

      // SECCIÓN 2: Información del cliente
      pdf.rect(10, yPos, 190, 20);
      pdf.setFontSize(9);
      pdf.text(`Razón Social / Nombres y Apellidos: ${doc.entityName}`, 12, yPos + 6);
      pdf.text(`Identificación: ${doc.entityRuc || '9999999999999'}`, 12, yPos + 11);
      pdf.text(`Fecha Emisión: ${doc.issueDate}`, 12, yPos + 16);

      yPos += 25;

      // SECCIÓN 3: Tabla de productos
      console.log('🔄 Agregando tabla de productos...');
      const productData = docItems.map((item, idx) => [
        item.productId || `ITM-${idx + 1}`,
        item.quantity.toString(),
        item.description,
        `$${item.unitPrice.toFixed(2)}`,
        `$${(item.discount || 0).toFixed(2)}`,
        `$${(item.quantity * item.unitPrice - (item.discount || 0)).toFixed(2)}`
      ]);

      console.log('📊 Datos de productos:', productData.length, 'filas');

      // Usar autoTable como función (versión 5.x)
      try {
        autoTable(pdf, {
          startY: yPos,
          head: [['Cod. Principal', 'Cant.', 'Descripción', 'Precio Unitario', 'Descuento', 'Precio Total']],
          body: productData,
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
          columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 15, halign: 'center' },
            2: { cellWidth: 70 },
            3: { cellWidth: 25, halign: 'right' },
            4: { cellWidth: 25, halign: 'right' },
            5: { cellWidth: 30, halign: 'right' }
          }
        });
        console.log('✅ Tabla de productos agregada exitosamente');
      } catch (error) {
        console.error('❌ ERROR agregando tabla de productos:', error);
        throw error;
      }

      yPos = (pdf as any).lastAutoTable.finalY + 5;
      console.log('✅ Tabla de productos agregada. Nueva posición Y:', yPos);

      // SECCIÓN 4: Información adicional y totales (lado a lado)
      // Cuadro izquierdo: Información adicional
      pdf.rect(10, yPos, 100, 50);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Información Adicional', 12, yPos + 6);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.text(`Email: ${doc.entityEmail || 'N/A'}`, 12, yPos + 12);
      pdf.text(`Teléfono: ${doc.entityPhone || 'N/A'}`, 12, yPos + 17);
      pdf.text(`Dirección: ${doc.entityAddress || 'N/A'}`, 12, yPos + 22, { maxWidth: 95 });

      pdf.setFont('helvetica', 'bold');
      pdf.text('Forma de Pago', 12, yPos + 32);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${doc.paymentMethod || 'SIN UTILIZACION DEL SISTEMA FINANCIERO'}: $${doc.total.toFixed(2)}`, 12, yPos + 37);

      // Cuadro derecho: Totales
      console.log('🔄 Agregando tabla de totales...');
      const totalsData = [
        ['SUBTOTAL 15%', `$${pdfSub15.toFixed(2)}`],
        ['SUBTOTAL 0%', `$${pdfSub0.toFixed(2)}`],
        ['SUBTOTAL No objeto de IVA', '$0.00'],
        ['SUBTOTAL Exento de IVA', '$0.00'],
        ['SUBTOTAL SIN IMPUESTOS', `$${(pdfSub15 + pdfSub0).toFixed(2)}`],
        ['TOTAL Descuento', `$${totalDiscount.toFixed(2)}`],
        ['ICE', '$0.00'],
        ['IVA 15%', `$${pdfTax.toFixed(2)}`],
        ['PROPINA', '$0.00'],
        ['VALOR TOTAL', `$${doc.total.toFixed(2)}`]
      ];

      try {
        autoTable(pdf, {
          startY: yPos,
          body: totalsData,
          margin: { left: 115 },
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 2 },
          columnStyles: {
            0: { cellWidth: 50 },
            1: { cellWidth: 35, halign: 'right' }
          },
          didParseCell: (data: any) => {
            if (data.row.index === 9) { // Última fila (VALOR TOTAL)
              data.cell.styles.fontStyle = 'bold';
            }
          }
        });
        console.log('✅ Tabla de totales agregada exitosamente');
      } catch (error) {
        console.error('❌ ERROR agregando tabla de totales:', error);
        throw error;
      }
      
      console.log('✅ Tabla de totales agregada');

      // Agregar código QR al final
      console.log('🔄 Agregando código QR al PDF...');
      const qrYPos = yPos + 55;
      
      try {
        pdf.addImage(qrCodeDataUrl, 'PNG', 10, qrYPos, 30, 30);
        console.log('✅ Código QR agregado al PDF');
      } catch (error) {
        console.error('⚠️ Error agregando QR:', error);
      }
      
      pdf.setFontSize(6);
      pdf.text('CLAVE DE ACCESO', 10, qrYPos + 33);
      pdf.setFontSize(5);
      pdf.text(doc.accessKey, 10, qrYPos + 36, { maxWidth: 190 });

      console.log('✅ PDF completado. Preparando conversión a Base64...');
      
      // Verificar que el PDF tenga páginas
      const pageCount = pdf.internal.pages.length - 1; // -1 porque la primera es null
      console.log(`📄 Páginas en el PDF: ${pageCount}`);

      // Convertir a Base64 usando el método más confiable
      console.log('🔄 Convirtiendo PDF a Base64...');
      
      // Obtener el PDF como ArrayBuffer
      const pdfOutput = pdf.output('arraybuffer');
      console.log(`📦 PDF ArrayBuffer size: ${pdfOutput.byteLength} bytes (~${Math.round(pdfOutput.byteLength / 1024)} KB)`);
      
      // Convertir a Base64
      const uint8Array = new Uint8Array(pdfOutput);
      let binaryString = '';
      const chunkSize = 8192; // Procesar en chunks para evitar stack overflow
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
        binaryString += String.fromCharCode.apply(null, Array.from(chunk));
      }
      const pdfBase64 = btoa(binaryString);
      
      // Verificar que el PDF no esté vacío
      if (!pdfBase64 || pdfBase64.length < 1000) {
        console.error('❌ PDF generado está vacío o es muy pequeño');
        console.error('📊 Datos del PDF:', {
          docItemsLength: docItems.length,
          pdfOutputLength: pdfOutput.byteLength,
          base64Length: pdfBase64.length
        });
        return null;
      }
      
      console.log(`✅ PDF generado correctamente:`);
      console.log(`   - ArrayBuffer: ${pdfOutput.byteLength} bytes`);
      console.log(`   - Base64: ${pdfBase64.length} caracteres (~${Math.round(pdfBase64.length / 1024)} KB)`);
      console.log(`   - Estimado final: ~${Math.round((pdfOutput.byteLength) / 1024)} KB`);
      return pdfBase64;
      
    } catch (error) {
      console.error('Error generando PDF:', error);
      return null;
    }
  };

  // Función para enviar email manualmente
  const handleSendEmail = async () => {
    if (!lastDocument) {
      onNotify('No hay factura autorizada', 'warning');
      return;
    }

    const clientEmail = lastDocument.entityEmail || selectedClient?.email;
    if (!clientEmail) {
      onNotify('No hay email del cliente configurado', 'warning');
      return;
    }

    setSendingEmail(true);
    try {
      onNotify('Generando PDF del RIDE...', 'info');

      const attachments: any[] = [];

      // Adjuntar XML Base64
      if (lastDocument.authorizedXml) {
        const encoder = new TextEncoder();
        const xmlBytes = encoder.encode(lastDocument.authorizedXml);
        let xmlBinary = '';
        xmlBytes.forEach(byte => xmlBinary += String.fromCharCode(byte));
        attachments.push({
          filename: `factura_${lastDocument.number.replace(/-/g, '_')}.xml`,
          content: btoa(xmlBinary),
          type: 'application/xml'
        });
      }

      // Generar PDF usando los items guardados en el documento
      const pdfBase64 = await generatePdfBase64(lastDocument, lastDocument.items || []);
      if (pdfBase64) {
        attachments.push({
          filename: `factura_${lastDocument.number.replace(/-/g, '_')}.pdf`,
          content: pdfBase64,
          type: 'application/pdf'
        });
      } else {
        onNotify('Advertencia: No se pudo generar PDF', 'warning');
      }

      const response = await fetch('/api/notifications/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: clientEmail,
          subject: `Factura Electrónica N° ${lastDocument.number} - ${businessInfo.name}`,
          settings: notificationSettings,
          attachments: attachments.length > 0 ? attachments : undefined,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1e40af;">Factura Electrónica Autorizada</h2>
              <p>Estimado/a <strong>${lastDocument.entityName}</strong>,</p>
              <p>Adjunto encontrará su factura electrónica autorizada por el SRI en formato PDF y XML.</p>
              <div style="background: #f3f4f6; padding: 20px; border-radius: 10px; margin: 20px 0;">
                <p><strong>Número:</strong> ${lastDocument.number}</p>
                <p><strong>Fecha:</strong> ${lastDocument.issueDate}</p>
                <p><strong>Total:</strong> $${lastDocument.total.toFixed(2)}</p>
                <p><strong>Clave de Acceso:</strong> ${lastDocument.accessKey}</p>
              </div>
              <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
                Puede verificar este documento en el portal del SRI usando la clave de acceso.
              </p>
            </div>
          `
        })
      });

      if (response.ok) {
        onNotify('Correo enviado exitosamente con PDF y XML');
      } else {
        onNotify('Error al enviar el correo', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      onNotify('Error al enviar el correo', 'error');
    } finally {
      setSendingEmail(false);
    }
  };

  // Enviar email al cliente si tiene correo configurado (flujo automático)
  const sendAutoEmail = async (doc: Document, result: any, log: any) => {
    if (selectedClient?.email && result.authorizedXml) {
      log('📧 Enviando factura por correo al cliente...');
      try {
        // Generar PDF para el correo automático
        log('🔄 Generando PDF del RIDE...');
        const pdfBase64 = await generatePdfBase64(doc, items);
        log(pdfBase64 ? '✅ PDF generado correctamente' : '❌ Error generando PDF');

        const encoder = new TextEncoder();
        const xmlBytes = encoder.encode(result.authorizedXml);
        let xmlBinary = '';
        xmlBytes.forEach(byte => xmlBinary += String.fromCharCode(byte));
        const attachments = [{
          filename: `factura_${doc.number.replace(/-/g, '_')}.xml`,
          content: btoa(xmlBinary),
          type: 'application/xml'
        }];

        if (pdfBase64) {
          attachments.push({
            filename: `factura_${doc.number.replace(/-/g, '_')}.pdf`,
            content: pdfBase64,
            type: 'application/pdf'
          });
        } else {
          log('⚠️ No se pudo generar el PDF');
        }

        const emailResponse = await fetch('/api/notifications/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: selectedClient.email,
            subject: `Factura Electrónica N° ${doc.number} - ${businessInfo.name}`,
            settings: notificationSettings,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1e40af;">Factura Electrónica Autorizada</h2>
                <p>Estimado/a <strong>${selectedClient.name}</strong>,</p>
                <p>Se ha generado su factura electrónica con los siguientes detalles:</p>
                <div style="background: #f3f4f6; padding: 20px; border-radius: 10px; margin: 20px 0;">
                  <p><strong>Número:</strong> ${doc.number}</p>
                  <p><strong>Fecha:</strong> ${doc.issueDate}</p>
                  <p><strong>Total:</strong> $${totals.total.toFixed(2)}</p>
                  <p><strong>Clave de Acceso:</strong> ${result.claveAcceso}</p>
                </div>
                <p>El documento XML autorizado se adjunta a este correo.</p>
                <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
                  Este es un correo automático. Puede verificar este documento en el portal del SRI.
                </p>
              </div>
            `,
            attachments: attachments
          })
        });

        if (emailResponse.ok) {
          log('✅ Correo enviado exitosamente al cliente');
          onNotify('Factura autorizada y enviada por correo al cliente');
        } else {
          log('⚠️ No se pudo enviar el correo al cliente');
          onNotify('Factura autorizada (correo no enviado)');
        }
      } catch (emailError) {
        console.error('Error enviando email:', emailError);
        log('⚠️ Error al intentar enviar correo');
        onNotify('Factura autorizada (correo no enviado)');
      }
    }
  };

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowProductDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [prevPreloadRejected, setPrevPreloadRejected] = useState<any>(null);

  if (preloadRejected && preloadRejected !== prevPreloadRejected) {
    setPrevPreloadRejected(preloadRejected);
    const doc = preloadRejected;
    if (doc.items && doc.items.length > 0) {
      setItems(doc.items.map((i: any) => ({ ...i })));
    }
    if (doc.entityRuc && doc.entityRuc !== '9999999999999') {
      const client = clients.find(c => c.ruc === doc.entityRuc);
      if (client) {
        setSelectedClient(client);
      } else {
        setIsNewClient(true);
        setNewClientData({
          ruc: doc.entityRuc || '',
          name: doc.entityName || '',
          email: doc.entityEmail || '',
          phone: doc.entityPhone || '',
          address: doc.entityAddress || '',
        });
      }
    }
    if (doc.paymentMethod) setPaymentMethod(doc.paymentMethod);
    if (doc.additionalInfo) setAdditionalInfo(doc.additionalInfo);
  }

  // Cargar documento rechazado para re-emision
  useEffect(() => {
    if (!preloadRejected) return;
    if (onClearPreload) onClearPreload();
    onNotify('Documento rechazado cargado. Corrija los errores y vuelva a emitir.', 'info');
  }, [preloadRejected]);

  const totals = useMemo(() => {
    let sub15 = 0, sub0 = 0, desc = 0, tax = 0;
    const totalBase = items.reduce((acc, i) => acc + (i.quantity * i.unitPrice), 0);

    items.forEach(i => {
      let itemDiscount = i.discount || 0;
      if (invoiceType === 'Factura Básica' && discountType === 'TOTAL' && globalDiscount > 0 && totalBase > 0) {
        const itemBase = i.quantity * i.unitPrice;
        itemDiscount = (itemBase / totalBase) * globalDiscount;
      }
      const base = i.quantity * i.unitPrice - itemDiscount;
      const net = Math.max(0, base);
      desc += itemDiscount;
      if (i.taxRate > 0) {
        sub15 += net;
        tax += (net * (i.taxRate / 100));
      } else {
        sub0 += net;
      }
    });
    return { sub15, sub0, desc, tax, total: sub15 + sub0 + tax };
  }, [items, invoiceType, discountType, globalDiscount]);

  const addItem = (product: Product) => {
    const unitPrice = product[priceTier] || product.price;
    const existing = items.find(i => i.productId === product.id);
    if (existing) {
      updateItem(product.id, 'quantity', existing.quantity + 1);
    } else {
      setItems([...items, {
        productId: product.id,
        description: product.description,
        quantity: 1,
        unitPrice,
        discount: 0,
        taxRate: product.taxRate,
        total: unitPrice,
        imageUrl: product.imageUrl,
        type: product.type
      }]);
    }
    setShowProductDropdown(false);
    setSearchTerm('');
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(items.map(i => {
      if (i.productId === id) {
        const updated = { ...i, [field]: value };
        updated.total = Math.max(0, (updated.quantity * updated.unitPrice) - (updated.discount || 0));
        return updated;
      }
      return i;
    }));
  };

  const addReimbursement = () => {
    if (reimbursementForm.identificacionProveedorReembolso && reimbursementForm.codDocReembolso) {
      setReimbursements([...reimbursements, reimbursementForm as ReimbursementDetail]);
      setShowReimbursementForm(false);
      setReimbursementForm({
        tipoIdentificacionProveedorReembolso: '04',
        tipoProveedorReembolso: '01',
        codDocReembolso: '01',
        baseImponibleSinIva: 0,
        baseImponibleConIva: 0,
        impuestoReembolso: 0
      });
    }
  };

  const handleIdLookup = () => {
    const ruc = newClientData.ruc.trim();
    if (ruc.length !== 10 && ruc.length !== 13) return;

    // 1. Buscar en locales primero
    const matched = clients.find(c => c.ruc === ruc);
    if (matched) {
      setNewClientData({
        ruc: matched.ruc,
        name: matched.name,
        email: matched.email || '',
        phone: matched.phone || '',
        address: matched.address || ''
      });
      onNotify(`Cliente encontrado en base de datos: ${matched.name}`, 'info');
      return;
    }

    // 2. Resolvedor simulado si no existe y Razón Social está vacía
    if (!newClientData.name) {
      const nombres = ['María José', 'Juan Carlos', 'Luis Alberto', 'Ana Belén', 'Carlos Alfredo', 'Diana Carolina', 'José Vicente', 'Sandra Elizabeth'];
      const apellidos = ['Vallejo', 'Mendoza', 'Pazmiño', 'Chávez', 'Cárdenas', 'Guevara', 'Zambrano', 'Rodríguez'];
      
      const seed = parseInt(ruc.substring(3, 8)) || 0;
      const nombreElegido = nombres[seed % nombres.length];
      const apellidoElegido = apellidos[(seed + 3) % apellidos.length];
      const apellido2Elegido = apellidos[(seed + 7) % apellidos.length];
      
      const nameMock = `${nombreElegido} ${apellidoElegido} ${apellido2Elegido}`.toUpperCase();
      
      setNewClientData(prev => ({
        ...prev,
        name: nameMock,
        address: prev.address || 'Quito, Ecuador',
        email: prev.email || `${nombreElegido.toLowerCase().replace(' ', '.')}.${apellidoElegido.toLowerCase()}@ejemplo.com`
      }));
      onNotify(`Identificación resuelta en registro (Simulado): ${nameMock}`, 'info');
    }
  };

  const handleProcess = async () => {
    setIsSubmitting(true);
    setShowPreview(false);
    setAuthLogs([]);

    const log = (msg: string) => {
      setAuthStep(msg);
      setAuthLogs(prev => [...prev, { id: crypto.randomUUID(), text: `[${new Date().toLocaleTimeString()}] ${msg}` }]);
    };

    // Generar número secuencial desde el backend (DB Sequence)
    log('Solicitando secuencial al servidor...');
    let sequential: string;
    let docNumber: string;
    let estabCode: string;
    let emiCode: string;

    try {
      const token = localStorage.getItem('adminToken');
      const seqResponse = await fetch(`${API_URL}/api/documents/next-sequence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: '01',
          establishmentCode: selectedEmissionPoint?.establishmentCode || businessInfo.establishmentCode || '001',
          emissionPointCode: selectedEmissionPoint?.emissionPointCode || businessInfo.emissionPointCode || '001',
        })
      });

      if (!seqResponse.ok) {
        const err = await seqResponse.json().catch(() => ({}));
        throw new Error(err.message || 'Error obteniendo secuencial');
      }

      const seqData = await seqResponse.json();
      sequential = seqData.sequential;
      docNumber = seqData.number;
      estabCode = seqData.establishmentCode;
      emiCode = seqData.emissionPointCode;
      log(`Secuencial obtenido: ${docNumber}`);
    } catch (error: any) {
      onNotify(error.message || 'Error al obtener secuencial del servidor', 'error');
      setIsSubmitting(false);
      setAuthStep('');
      return;
    }

    // Convertir fecha a formato DDMMYYYY
    const today = new Date();
    const day = today.getDate().toString().padStart(2, '0');
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const year = today.getFullYear().toString();
    const dateFormatted = `${day}${month}${year}`;

    const numericCode = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');

    const accessKey = generateAccessKey(
      dateFormatted,
      '01',
      businessInfo.ruc,
      businessInfo.isProduction ? '2' : '1',
      estabCode,
      emiCode,
      sequential,
      numericCode,
      '1'
    );

    let clientToUse: Client | null = null;

    if (isNewClient) {
      if (!newClientData.ruc || !newClientData.name) {
        onNotify("Identificación y Razón Social son obligatorios para el nuevo cliente", "error");
        setIsSubmitting(false);
        setAuthStep('');
        return;
      }

      if ((newClientData.ruc.length === 10 || newClientData.ruc.length === 13) && !validateEcuadorianId(newClientData.ruc) && newClientData.ruc !== '9999999999999') {
        onNotify("El RUC/Cédula del nuevo cliente no es válido para Ecuador", "error");
        setIsSubmitting(false);
        setAuthStep('');
        return;
      }

      // Buscar si el cliente ya existe por RUC
      const existing = clients.find(c => c.ruc === newClientData.ruc);
      if (existing) {
        onNotify(`Se encontró un cliente existente con la identificación ${newClientData.ruc}. Se usará ese cliente.`);
        clientToUse = existing;
      } else {
        // Registrar cliente
        if (isDemoMode) {
          const newClientObj: Client = {
            id: `demo-${Date.now()}`,
            ruc: newClientData.ruc,
            name: newClientData.name,
            email: newClientData.email || '',
            phone: newClientData.phone || '',
            address: newClientData.address || '',
            type: 'CLIENTE'
          };
          if (setClients) {
            setClients(prev => [newClientObj, ...prev]);
          }
          clientToUse = newClientObj;
          onNotify("Cliente guardado automáticamente (Modo Demo)");
        } else {
          try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`${API_URL}/api/clients`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                ruc: newClientData.ruc,
                name: newClientData.name,
                email: newClientData.email || '',
                phone: newClientData.phone || '',
                address: newClientData.address || '',
                type: 'CLIENTE'
              })
            });
            if (!response.ok) {
              const err = await response.json().catch(() => ({}));
              throw new Error(err.message || err.error || 'Error al guardar el cliente');
            }
            const savedClient = await response.json();
            if (setClients) {
              setClients(prev => [savedClient, ...prev]);
            }
            clientToUse = savedClient;
            onNotify("Cliente guardado automáticamente");
          } catch (error: any) {
            onNotify(error.message || "Error al registrar cliente", "error");
            setIsSubmitting(false);
            setAuthStep('');
            return;
          }
        }
      }
    } else {
      clientToUse = selectedClient;
    }

    const finalEmail = customEmail || clientToUse?.email || '';
    const finalPhone = customPhone || clientToUse?.phone || '';

    let finalItems = [...items];
    if (invoiceType === 'Factura Básica' && discountType === 'TOTAL' && globalDiscount > 0) {
       const totalBase = items.reduce((acc, i) => acc + (i.quantity * i.unitPrice), 0);
       if (totalBase > 0) {
          finalItems = items.map(i => {
             const proportion = (i.quantity * i.unitPrice) / totalBase;
             return { ...i, discount: proportion * globalDiscount };
          });
       }
    }

    const doc: Document = {
      id: Math.random().toString(36).substr(2, 9),
      type: isProforma ? DocumentType.PROFORMA : DocumentType.INVOICE,
      number: docNumber,
      accessKey: accessKey,
      issueDate: getLocalDateISO(),
      entityName: clientToUse?.name || 'CONSUMIDOR FINAL',
      entityRuc: clientToUse?.ruc || '9999999999999',
      entityEmail: finalEmail,
      entityPhone: finalPhone,
      entityAddress: clientToUse?.address || '',
      total: totals.total + tip,
      tip: tip,
      additionalInfo: additionalInfo || undefined,
      exportDetails: invoiceType === 'Factura Exportación' ? exportDetails : undefined,
      isReimbursement: invoiceType === 'Factura Reembolso',
      reimbursements: invoiceType === 'Factura Reembolso' ? reimbursements : undefined,
      status: isProforma ? SriStatus.DRAFT : SriStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      paymentMethod,
      items: finalItems
    };

    if (isProforma) {
      onAuthorize(doc, items);
      onNotify('Proforma generada exitosamente. Puede convertirla a factura cuando desee.');
      setItems([]);
      setSelectedClient(null);
      setNewClientData({ ruc: '', name: '', email: '', phone: '', address: '' });
      setIsNewClient(false);
      setIsProforma(false);
      setIsSubmitting(false);
      setAuthStep('');
      return;
    }

    const xml = buildInvoiceXml(doc, businessInfo, items);

    // Preparar opciones de firma si está disponible
    const signatureOptions = signatureFile && signaturePassword ? {
      p12File: signatureFile,
      password: signaturePassword,
      claveAcceso: accessKey
    } : null;

    const result = await authorizeWithSRI(xml, businessInfo.isProduction, signatureOptions, log, (businessInfo as any).isDemo || false);

    if (result.status === SriStatus.AUTHORIZED) {
      const authorizedDoc = {
        ...doc,
        status: SriStatus.AUTHORIZED,
        accessKey: result.claveAcceso || accessKey,
        authorizedXml: result.authorizedXml, // Guardar el XML autorizado
        items: items // IMPORTANTE: Guardar los items para poder generar el PDF después
      };
      setLastDocument(authorizedDoc);
      onAuthorize(authorizedDoc, items);

      // Enviar email al cliente si tiene correo configurado
      if (selectedClient?.email && result.authorizedXml) {
        await sendAutoEmail(authorizedDoc, result, log);
      } else {
        onNotify(result.message);
      }

      setItems([]);
      setSelectedClient(null);
      setNewClientData({ ruc: '', name: '', email: '', phone: '', address: '' });
      setIsNewClient(false);
    } else if (result.status === SriStatus.REJECTED) {
      const rejectedDoc = {
        ...doc,
        status: SriStatus.REJECTED,
        accessKey: accessKey,
        additionalInfo: `[RECHAZADA SRI] ${result.message}` + (additionalInfo ? ` | ${additionalInfo}` : ''),
        items: items
      };
      onAuthorize(rejectedDoc, items);
      onNotify(result.message || 'Comprobante rechazado por el SRI', 'error');

      setItems([]);
      setSelectedClient(null);
      setNewClientData({ ruc: '', name: '', email: '', phone: '', address: '' });
      setIsNewClient(false);
    } else {
      onNotify(result.message, 'warning');
    }

    setIsSubmitting(false);
    setAuthStep('');
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 lg:gap-8 animate-in fade-in duration-700 relative">
      <div className="xl:col-span-3 space-y-6">
        {lastDocument && (
          <div className={`${lastDocument.type === DocumentType.PROFORMA ? 'bg-amber-600 shadow-amber-200' : 'bg-emerald-600 shadow-emerald-200'} rounded-[2.5rem] lg:rounded-[3.5rem] p-6 lg:p-10 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl print:hidden`}>
            <div className="flex items-center gap-4 lg:gap-6 text-center md:text-left flex-col md:flex-row">
              <div className="w-16 h-16 lg:w-20 lg:h-20 bg-white/20 rounded-[1.5rem] lg:rounded-[2rem] flex items-center justify-center"><DocumentTextIcon className="w-8 h-8 lg:w-10 lg:h-10" /></div>
              <div>
                <h3 className="text-xl lg:text-2xl font-black tracking-tighter uppercase">{lastDocument.type === DocumentType.PROFORMA ? 'Proforma Generada' : 'Factura Autorizada'}</h3>
                <p className="text-white/70 font-bold text-[10px] uppercase tracking-widest mt-1">{lastDocument.type === DocumentType.PROFORMA ? `#${lastDocument.number}` : `Clave: ${lastDocument.accessKey.substring(0, 20)}...`}</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <button type="button" onClick={() => setShowRide(true)} className={`${isDarkMode ? 'bg-slate-700 text-emerald-400' : 'bg-white text-emerald-600'} px-6 py-3 rounded-xl lg:rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all inline-flex items-center gap-2`}><PrinterIcon className="w-4 h-4" /> Ver RIDE</button>
              {lastDocument.type === DocumentType.PROFORMA ? (
                <button type="button" onClick={() => {
                  const proformaData = lastDocument;
                  setLastDocument(null);
                  if (proformaData.entityRuc) {
                    const client = clients.find(c => c.ruc === proformaData.entityRuc);
                    if (client) setSelectedClient(client);
                  }
                  if (proformaData.items) setItems(proformaData.items.map(i => ({...i})));
                  setIsProforma(false);
                  onNotify('Datos de proforma cargados. Revise y presione "Conectar con SRI" para emitir la factura.', 'info');
                }} className={`${isDarkMode ? 'bg-slate-700 text-sky-400' : 'bg-white text-sky-500'} px-6 py-3 rounded-xl lg:rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all`}>
                  Convertir a Factura
                </button>
              ) : (
                <>
                  {lastDocument.entityEmail && (
                    <button type="submit"
                      onClick={handleSendEmail}
                      disabled={sendingEmail}
                      className={`${isDarkMode ? 'bg-slate-700 text-sky-400' : 'bg-white text-sky-500'} px-6 py-3 rounded-xl lg:rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {sendingEmail ? (
                        <div className="flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                          Enviando...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2"><EnvelopeIcon className="w-4 h-4" /> Enviar Email</div>
                      )}
                    </button>
                  )}
                </>
              )}
              <button type="button" onClick={() => setLastDocument(null)} className={`${lastDocument.type === DocumentType.PROFORMA ? 'bg-amber-700 hover:bg-amber-800' : 'bg-emerald-700 hover:bg-emerald-800'} text-white px-6 py-3 rounded-xl lg:rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all`}>{lastDocument.type === DocumentType.PROFORMA ? 'Nueva Proforma' : 'Nueva Factura'}</button>
            </div>
          </div>
        )}

        {!lastDocument && (
          <>
            {/* TIPOS DE FACTURA */}
            <div className={`flex flex-wrap gap-2 mb-6 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'} p-3 rounded-2xl shadow-sm border`}>
              {['Factura Simple', 'Factura Básica', 'Factura Exportación', 'Factura Reembolso'].map(type => (
                <button type="button"
                  key={type}
                  onClick={() => setInvoiceType(type)}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${invoiceType === type ? 'bg-slate-900 text-white dark:bg-sky-500 dark:text-white shadow-md' : (isDarkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')}`}
                >
                  {type}
                </button>
              ))}
            </div>

            <div className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'} p-4 sm:p-6 lg:p-8 rounded-[2rem] lg:rounded-[2.5rem] shadow-sm flex flex-col gap-4 sm:gap-6`}>
              <div className="flex flex-col md:flex-row gap-4 sm:gap-6 items-stretch md:items-end">
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between items-center mb-1">
                    <label htmlFor={`${fieldId}-clienteReceptor`} className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} px-1 block`}>Cliente Receptor</label>
                    <div className="flex bg-slate-100 dark:bg-slate-700 p-0.5 rounded-lg text-[9px] font-black">
                      <button
                        type="button"
                        onClick={() => setIsNewClient(false)}
                        className={`px-3 py-1 rounded-md transition-all ${!isNewClient ? 'bg-white dark:bg-slate-600 shadow-sm text-sky-500 dark:text-sky-400 font-bold' : 'text-slate-400 dark:text-slate-400 font-medium'}`}
                      >
                        Existente / Final
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsNewClient(true)}
                        className={`px-3 py-1 rounded-md transition-all ${isNewClient ? 'bg-white dark:bg-slate-600 shadow-sm text-sky-500 dark:text-sky-400 font-bold' : 'text-slate-400 dark:text-slate-400 font-medium'}`}
                      >
                        + Nuevo Cliente
                      </button>
                    </div>
                  </div>
                  {!isNewClient ? (
                    <select id={`${fieldId}-clienteReceptor`} className={`w-full ${isDarkMode ? 'bg-slate-700 text-white border-slate-600' : 'bg-slate-50'} p-3 sm:p-4 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-sky-500 transition-all text-sm min-h-[48px]`} onChange={e => setSelectedClient(clients.find(c => c.id === e.target.value) || null)} value={selectedClient?.id || ''}>
                      <option value="">Consumidor Final (9999999999999)</option>
                      {(Array.isArray(clients) ? clients : []).map(c => <option key={c.id} value={c.id}>{c.name} ({c.ruc})</option>)}
                    </select>
                  ) : (
                    <div className={`p-3 ${isDarkMode ? 'bg-slate-700 text-slate-300 border-slate-600' : 'bg-slate-50 text-slate-500'} rounded-2xl border font-bold text-xs flex items-center justify-between min-h-[48px]`}>
                      <span>Rellene los datos del cliente a continuación:</span>
                    </div>
                  )}
                </div>
                {(emissionPoints && emissionPoints.length > 1) && (
                  <div className="md:w-48 space-y-2">
                    <label htmlFor={`${fieldId}-ptoEmision`} className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} px-1 block`}>Pto. Emisión</label>
                    <select
                      id={`${fieldId}-ptoEmision`}
                      className={`w-full ${isDarkMode ? 'bg-slate-700 text-white border-slate-600' : 'bg-slate-50'} p-3 sm:p-4 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-sky-500 transition-all text-xs min-h-[48px]`}
                      value={selectedEmissionPoint?.id || ''}
                      onChange={e => {
                        const ep = emissionPoints.find(p => p.id === e.target.value);
                        if (ep && onSelectEmissionPoint) onSelectEmissionPoint(ep);
                      }}
                    >
                      {emissionPoints.map(ep => (
                        <option key={ep.id} value={ep.id}>{ep.establishmentCode}-{ep.emissionPointCode}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="md:w-64 space-y-2">
                  <label htmlFor={`${fieldId}-priceTier`} className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} px-1 block`}>Esquema Tarifario</label>
                  <select id={`${fieldId}-priceTier`} className={`w-full ${isDarkMode ? 'bg-slate-700 text-blue-300 border-slate-600' : 'bg-sky-50 text-sky-500'} p-3 sm:p-4 rounded-2xl font-black outline-none border-2 text-sm min-h-[48px]`} value={priceTier} onChange={e => setPriceTier(e.target.value as any)}>
                    <option value="price">PVP PÚBLICO</option>
                    <option value="wholesalePrice">MAYORISTA</option>
                    <option value="distributorPrice">DISTRIBUIDOR</option>
                  </select>
                </div>
              </div>

              {/* Formulario Inline de Nuevo Cliente */}
              {isNewClient && (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                  <div className="md:col-span-2 space-y-2">
                    <label htmlFor={`${fieldId}-newClientRuc`} className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} px-1 block`}>Identificación (RUC / Cédula) *</label>
                    <div className="relative">
                      <input
                        id={`${fieldId}-newClientRuc`}
                        type="text"
                        placeholder="Ej: 1722334455001"
                        value={newClientData.ruc}
                        onChange={e => setNewClientData({ ...newClientData, ruc: e.target.value })}
                        onBlur={handleIdLookup}
                        className={`w-full ${isDarkMode ? 'bg-slate-700 text-white border-slate-600' : 'bg-slate-50'} p-3 pr-12 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-sky-500 transition-all text-sm min-h-[48px]`}
                      />
                      <button
                        type="button"
                        onClick={handleIdLookup}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-sky-500 p-1 transition-colors"
                        title="Consultar Identificación"
                      >
                        <MagnifyingGlassIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="md:col-span-3 space-y-2">
                    <label htmlFor={`${fieldId}-newClientName`} className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} px-1 block`}>Razón Social / Nombre Completo *</label>
                    <input
                      id={`${fieldId}-newClientName`}
                      type="text"
                      placeholder="Ej: Juan Pérez o Empresa S.A."
                      value={newClientData.name}
                      onChange={e => setNewClientData({ ...newClientData, name: e.target.value })}
                      className={`w-full ${isDarkMode ? 'bg-slate-700 text-white border-slate-600' : 'bg-slate-50'} p-3 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-sky-500 transition-all text-sm min-h-[48px]`}
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label htmlFor={`${fieldId}-newClientEmail`} className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} px-1 block`}>Correo Electrónico</label>
                    <input
                      id={`${fieldId}-newClientEmail`}
                      type="email"
                      placeholder="ejemplo@correo.com"
                      value={newClientData.email}
                      onChange={e => setNewClientData({ ...newClientData, email: e.target.value })}
                      className={`w-full ${isDarkMode ? 'bg-slate-700 text-white border-slate-600' : 'bg-slate-50'} p-3 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-sky-500 transition-all text-sm min-h-[48px]`}
                    />
                  </div>
                  <div className="md:col-span-1 space-y-2">
                    <label htmlFor={`${fieldId}-newClientPhone`} className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} px-1 block`}>Teléfono</label>
                    <input
                      id={`${fieldId}-newClientPhone`}
                      type="text"
                      placeholder="0999999999"
                      value={newClientData.phone}
                      onChange={e => setNewClientData({ ...newClientData, phone: e.target.value })}
                      className={`w-full ${isDarkMode ? 'bg-slate-700 text-white border-slate-600' : 'bg-slate-50'} p-3 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-sky-500 transition-all text-sm min-h-[48px]`}
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label htmlFor={`${fieldId}-newClientAddress`} className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} px-1 block`}>Dirección Completa</label>
                    <input
                      id={`${fieldId}-newClientAddress`}
                      type="text"
                      placeholder="Ej: Av. Amazonas y Colón, Quito"
                      value={newClientData.address}
                      onChange={e => setNewClientData({ ...newClientData, address: e.target.value })}
                      className={`w-full ${isDarkMode ? 'bg-slate-700 text-white border-slate-600' : 'bg-slate-50'} p-3 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-sky-500 transition-all text-sm min-h-[48px]`}
                    />
                  </div>
                </div>
              )}

              {/* Campos extra opcionales */}
              {selectedClient && (
                <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                  <div className="flex-1 space-y-2">
                    <label htmlFor={`${fieldId}-correo2`} className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} px-1 block`}>Correo 2 (Opcional)</label>
                    <input
                      id={`${fieldId}-correo2`}
                      type="email"
                      placeholder={selectedClient.email || 'ejemplo@correo.com'}
                      className={`w-full ${isDarkMode ? 'bg-slate-700 text-white border-slate-600' : 'bg-slate-50'} p-3 rounded-xl font-bold outline-none border-2 border-transparent focus:border-sky-500 transition-all text-sm`}
                      value={customEmail}
                      onChange={e => setCustomEmail(e.target.value)}
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <label htmlFor={`${fieldId}-telefono2`} className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} px-1 block`}>Teléfono 2 (Opcional)</label>
                    <input
                      id={`${fieldId}-telefono2`}
                      type="text"
                      placeholder={selectedClient.phone || '0999999999'}
                      className={`w-full ${isDarkMode ? 'bg-slate-700 text-white border-slate-600' : 'bg-slate-50'} p-3 rounded-xl font-bold outline-none border-2 border-transparent focus:border-sky-500 transition-all text-sm`}
                      value={customPhone}
                      onChange={e => setCustomPhone(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Controles de Factura Básica */}
              {invoiceType === 'Factura Básica' && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-700/50 flex flex-wrap items-center gap-4">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Descuento:</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="discount" className="text-sky-500 focus:ring-sky-500" checked={discountType === 'TOTAL'} onChange={() => setDiscountType('TOTAL')} />
                    <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>Al total de la factura</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="discount" className="text-sky-500 focus:ring-sky-500" checked={discountType === 'PRODUCT'} onChange={() => setDiscountType('PRODUCT')} />
                    <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>Directo al producto</span>
                  </label>
                  
                  {discountType === 'TOTAL' && (
                    <div className="flex items-center gap-2 md:ml-auto">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Monto ($):</span>
                      <input 
                        type="number"
                        min="0"
                        step="0.01"
                        className={`w-24 p-2 rounded-xl font-bold outline-none border-2 border-transparent focus:border-sky-500 transition-all text-sm ${isDarkMode ? 'bg-slate-700 text-white border-slate-600' : 'bg-slate-50 text-slate-800'}`}
                        value={globalDiscount || ''}
                        onChange={e => setGlobalDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Campos Factura Exportación */}
              {invoiceType === 'Factura Exportación' && (
                <div className="pt-6 mt-2 border-t border-slate-100 dark:border-slate-700/50 space-y-4">
                  <h4 className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Datos de Comercio Exterior</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label htmlFor={`${fieldId}-comercioExterior`} className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} px-1 block`}>Comercio Exterior</label>
                      <input id={`${fieldId}-comercioExterior`} type="text" className={`w-full ${isDarkMode ? 'bg-slate-700 text-white border-slate-600' : 'bg-slate-50'} p-3 rounded-xl font-bold outline-none border-2 border-transparent focus:border-sky-500 transition-all text-sm`} value={exportDetails.comercioExterior} onChange={e => setExportDetails({...exportDetails, comercioExterior: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor={`${fieldId}-lugarIncoterm`} className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} px-1 block`}>Lugar Inco Term</label>
                      <input id={`${fieldId}-lugarIncoterm`} type="text" placeholder="Ej: Miami" className={`w-full ${isDarkMode ? 'bg-slate-700 text-white border-slate-600' : 'bg-slate-50'} p-3 rounded-xl font-bold outline-none border-2 border-transparent focus:border-sky-500 transition-all text-sm`} value={exportDetails.lugarIncoterm} onChange={e => setExportDetails({...exportDetails, lugarIncoterm: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor={`${fieldId}-incoTermTotal`} className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} px-1 block`}>Inco Term Total</label>
                      <select id={`${fieldId}-incoTermTotal`} className={`w-full ${isDarkMode ? 'bg-slate-700 text-white border-slate-600' : 'bg-slate-50'} p-3 rounded-xl font-bold outline-none border-2 border-transparent focus:border-sky-500 transition-all text-sm`} value={exportDetails.incoTermTotalSinImpuestos} onChange={e => setExportDetails({...exportDetails, incoTermTotalSinImpuestos: e.target.value})}>
                        <option value="">Seleccione</option><option value="FOB">FOB</option><option value="CIF">CIF</option><option value="EXW">EXW</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor={`${fieldId}-puertoEmbarque`} className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} px-1 block`}>Puerto Embarque</label>
                      <input id={`${fieldId}-puertoEmbarque`} type="text" className={`w-full ${isDarkMode ? 'bg-slate-700 text-white border-slate-600' : 'bg-slate-50'} p-3 rounded-xl font-bold outline-none border-2 border-transparent focus:border-sky-500 transition-all text-sm`} value={exportDetails.puertoEmbarque} onChange={e => setExportDetails({...exportDetails, puertoEmbarque: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor={`${fieldId}-puertoDestino`} className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} px-1 block`}>Puerto Destino</label>
                      <input id={`${fieldId}-puertoDestino`} type="text" className={`w-full ${isDarkMode ? 'bg-slate-700 text-white border-slate-600' : 'bg-slate-50'} p-3 rounded-xl font-bold outline-none border-2 border-transparent focus:border-sky-500 transition-all text-sm`} value={exportDetails.puertoDestino} onChange={e => setExportDetails({...exportDetails, puertoDestino: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor={`${fieldId}-paisDestino`} className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} px-1 block`}>País Destino</label>
                      <select id={`${fieldId}-paisDestino`} className={`w-full ${isDarkMode ? 'bg-slate-700 text-white border-slate-600' : 'bg-slate-50'} p-3 rounded-xl font-bold outline-none border-2 border-transparent focus:border-sky-500 transition-all text-sm`} value={exportDetails.paisDestino} onChange={e => setExportDetails({...exportDetails, paisDestino: e.target.value})}>
                        <option value="">Seleccione</option><option value="US">Estados Unidos</option><option value="CO">Colombia</option><option value="PE">Perú</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Pestañas de Factura Reembolso */}
              {invoiceType === 'Factura Reembolso' && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-700/50">
                  <div className="flex border-b border-slate-200 dark:border-slate-700 mb-4">
                    <button type="button" onClick={() => setReimbursementTab('PRODUCTO')} className={`flex-1 py-3 text-sm font-black uppercase tracking-widest border-b-2 transition-all ${reimbursementTab === 'PRODUCTO' ? 'border-sky-500 text-sky-500' : 'border-transparent text-slate-400 hover:text-slate-500'}`}>
                      Sección Producto
                    </button>
                    <button type="button" onClick={() => setReimbursementTab('REEMBOLSO')} className={`flex-1 py-3 text-sm font-black uppercase tracking-widest border-b-2 transition-all ${reimbursementTab === 'REEMBOLSO' ? 'border-sky-500 text-sky-500' : 'border-transparent text-slate-400 hover:text-slate-500'}`}>
                      Sección Reembolso
                    </button>
                  </div>
                  {reimbursementTab === 'REEMBOLSO' && (
                    <div className="py-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl px-4">
                       {reimbursements.length > 0 ? (
                         <div className="mb-4 space-y-2">
                           {reimbursements.map((r, idx) => (
                             <div key={`${r.estabDocReembolso}-${r.ptoEmiDocReembolso}-${r.secuencialDocReembolso}`} className={`p-4 rounded-xl text-left border ${isDarkMode ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'} flex justify-between items-center`}>
                               <div>
                                 <div className="font-bold text-sm">Factura: {r.estabDocReembolso}-{r.ptoEmiDocReembolso}-{r.secuencialDocReembolso}</div>
                                 <div className="text-xs opacity-70">RUC: {r.identificacionProveedorReembolso}</div>
                               </div>
                               <div className="text-right text-xs">
                                 <div>Total IVA: ${r.impuestoReembolso.toFixed(2)}</div>
                               </div>
                             </div>
                           ))}
                         </div>
                       ) : (
                         <p className={`text-sm font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mb-4`}>Añade los comprobantes de reembolso aquí.</p>
                       )}
                       
                       {!showReimbursementForm ? (
                         <button type="button" onClick={() => setShowReimbursementForm(true)} className="mt-2 bg-sky-50 text-sky-600 px-6 py-2 rounded-xl font-bold hover:bg-sky-100 dark:bg-sky-900/30 dark:hover:bg-sky-900/50 transition-all border border-sky-200 dark:border-sky-800">Añadir Comprobante</button>
                       ) : (
                         <div className={`mt-4 p-4 text-left border rounded-2xl ${isDarkMode ? 'border-slate-600 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-800'} shadow-sm`}>
                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              <div className="space-y-1">
                                <label htmlFor={`${fieldId}-reimb-ruc`} className="text-[10px] font-black uppercase tracking-widest opacity-70">RUC Proveedor</label>
                                <input id={`${fieldId}-reimb-ruc`} type="text" className="w-full p-2 border-2 border-slate-200 dark:border-slate-600 rounded-xl dark:bg-slate-700 outline-none focus:border-sky-500 text-sm font-bold transition-all" value={reimbursementForm.identificacionProveedorReembolso || ''} onChange={e => setReimbursementForm({...reimbursementForm, identificacionProveedorReembolso: e.target.value})} />
                              </div>
                              <div className="space-y-1">
                                <label htmlFor={`${fieldId}-reimb-estab`} className="text-[10px] font-black uppercase tracking-widest opacity-70">Establecimiento (001)</label>
                                <input id={`${fieldId}-reimb-estab`} type="text" className="w-full p-2 border-2 border-slate-200 dark:border-slate-600 rounded-xl dark:bg-slate-700 outline-none focus:border-sky-500 text-sm font-bold transition-all" value={reimbursementForm.estabDocReembolso || ''} onChange={e => setReimbursementForm({...reimbursementForm, estabDocReembolso: e.target.value})} />
                              </div>
                              <div className="space-y-1">
                                <label htmlFor={`${fieldId}-reimb-ptoemi`} className="text-[10px] font-black uppercase tracking-widest opacity-70">Pto. Emisión (001)</label>
                                <input id={`${fieldId}-reimb-ptoemi`} type="text" className="w-full p-2 border-2 border-slate-200 dark:border-slate-600 rounded-xl dark:bg-slate-700 outline-none focus:border-sky-500 text-sm font-bold transition-all" value={reimbursementForm.ptoEmiDocReembolso || ''} onChange={e => setReimbursementForm({...reimbursementForm, ptoEmiDocReembolso: e.target.value})} />
                              </div>
                              <div className="space-y-1">
                                <label htmlFor={`${fieldId}-reimb-secuencial`} className="text-[10px] font-black uppercase tracking-widest opacity-70">Secuencial</label>
                                <input id={`${fieldId}-reimb-secuencial`} type="text" className="w-full p-2 border-2 border-slate-200 dark:border-slate-600 rounded-xl dark:bg-slate-700 outline-none focus:border-sky-500 text-sm font-bold transition-all" value={reimbursementForm.secuencialDocReembolso || ''} onChange={e => setReimbursementForm({...reimbursementForm, secuencialDocReembolso: e.target.value})} />
                              </div>
                              <div className="space-y-1">
                                <label htmlFor={`${fieldId}-reimb-fecha`} className="text-[10px] font-black uppercase tracking-widest opacity-70">Fecha (DD/MM/YYYY)</label>
                                <input id={`${fieldId}-reimb-fecha`} type="text" className="w-full p-2 border-2 border-slate-200 dark:border-slate-600 rounded-xl dark:bg-slate-700 outline-none focus:border-sky-500 text-sm font-bold transition-all" value={reimbursementForm.fechaEmisionDocReembolso || ''} onChange={e => setReimbursementForm({...reimbursementForm, fechaEmisionDocReembolso: e.target.value})} />
                              </div>
                              <div className="space-y-1">
                                <label htmlFor={`${fieldId}-reimb-autorizacion`} className="text-[10px] font-black uppercase tracking-widest opacity-70">Autorización</label>
                                <input id={`${fieldId}-reimb-autorizacion`} type="text" className="w-full p-2 border-2 border-slate-200 dark:border-slate-600 rounded-xl dark:bg-slate-700 outline-none focus:border-sky-500 text-sm font-bold transition-all" value={reimbursementForm.numeroautorizacionDocReemb || ''} onChange={e => setReimbursementForm({...reimbursementForm, numeroautorizacionDocReemb: e.target.value})} />
                              </div>
                              <div className="space-y-1">
                                <label htmlFor={`${fieldId}-reimb-baseSinIva`} className="text-[10px] font-black uppercase tracking-widest opacity-70 text-sky-600 dark:text-sky-400">Base Sin IVA ($)</label>
                                <input id={`${fieldId}-reimb-baseSinIva`} type="number" className="w-full p-2 border-2 border-slate-200 dark:border-slate-600 rounded-xl dark:bg-slate-700 outline-none focus:border-sky-500 text-sm font-bold transition-all" value={reimbursementForm.baseImponibleSinIva || ''} onChange={e => setReimbursementForm({...reimbursementForm, baseImponibleSinIva: parseFloat(e.target.value) || 0})} />
                              </div>
                              <div className="space-y-1">
                                <label htmlFor={`${fieldId}-reimb-baseConIva`} className="text-[10px] font-black uppercase tracking-widest opacity-70 text-sky-600 dark:text-sky-400">Base Con IVA ($)</label>
                                <input id={`${fieldId}-reimb-baseConIva`} type="number" className="w-full p-2 border-2 border-slate-200 dark:border-slate-600 rounded-xl dark:bg-slate-700 outline-none focus:border-sky-500 text-sm font-bold transition-all" value={reimbursementForm.baseImponibleConIva || ''} onChange={e => setReimbursementForm({...reimbursementForm, baseImponibleConIva: parseFloat(e.target.value) || 0})} />
                              </div>
                              <div className="space-y-1">
                                <label htmlFor={`${fieldId}-reimb-valorIva`} className="text-[10px] font-black uppercase tracking-widest opacity-70 text-sky-600 dark:text-sky-400">Valor IVA ($)</label>
                                <input id={`${fieldId}-reimb-valorIva`} type="number" className="w-full p-2 border-2 border-slate-200 dark:border-slate-600 rounded-xl dark:bg-slate-700 outline-none focus:border-sky-500 text-sm font-bold transition-all" value={reimbursementForm.impuestoReembolso || ''} onChange={e => setReimbursementForm({...reimbursementForm, impuestoReembolso: parseFloat(e.target.value) || 0})} />
                              </div>
                           </div>
                           <div className="mt-6 flex gap-3">
                             <button type="submit" onClick={addReimbursement} className="bg-sky-500 hover:bg-sky-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-md transition-all text-sm">Guardar Comprobante</button>
                             <button type="button" onClick={() => setShowReimbursementForm(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-300 px-6 py-2.5 rounded-xl font-bold transition-all text-sm">Cancelar</button>
                           </div>
                         </div>
                       )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'} p-3 sm:p-4 lg:p-8 rounded-[2rem] lg:rounded-[2.5rem] shadow-sm min-h-[400px] sm:min-h-[500px] relative overflow-visible ${reimbursementTab === 'REEMBOLSO' ? 'hidden' : ''}`}>
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
                <h3 className={`font-black ${isDarkMode ? 'text-white' : 'text-slate-800'} uppercase tracking-tighter text-base sm:text-lg`}>Detalle de Productos</h3>
                <div ref={searchRef} className="relative w-full lg:w-96">
                  <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400"><MagnifyingGlassIcon className="w-5 h-5" /></div>
                  <input
                    type="text"
                    placeholder="Buscar producto por nombre o código..."
                    className="w-full bg-slate-100 p-3 sm:p-4 pl-10 sm:pl-12 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all border-2 border-transparent focus:border-indigo-400"
                    value={searchTerm}
                    onChange={e => { setSearchTerm(e.target.value); setShowProductDropdown(true); }}
                    onFocus={() => searchTerm && setShowProductDropdown(true)}
                  />
                  {showProductDropdown && searchTerm && (
                    <div className={`absolute top-full left-0 right-0 ${isDarkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-sky-200'} rounded-2xl mt-2 shadow-2xl z-[100] max-h-64 sm:max-h-96 overflow-y-auto`}>
                      {(() => {
                        const list = (Array.isArray(products) ? products : []).filter(p =>
                          !p.isRawMaterial && (
                          p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.code.toLowerCase().includes(searchTerm.toLowerCase()))
                        );
                        if (list.length > 0) {
                          return (
                            <div className="p-2">
                              {list.map(p => (
                                <button type="button"
                                  key={p.id}
                                  onClick={() => addItem(p)}
                                  className="w-full text-left p-3 hover:bg-sky-50 rounded-xl flex items-center gap-4 transition-colors group"
                                >
                                  {p.imageUrl ? (
                                    <img src={p.imageUrl} alt={p.description} className="w-14 h-14 rounded-lg object-cover border border-slate-200 group-hover:border-indigo-400" />
                                  ) : (
                                    <div className="w-14 h-14 rounded-lg bg-slate-100 flex items-center justify-center"><CubeIcon className="w-6 h-6 text-slate-400" /></div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-800'} truncate`}>{p.description}</p>
                                    <div className="flex items-center gap-3 mt-1">
                                      <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{p.code}</span>
                                      <span className={`text-xs font-bold ${isDarkMode ? 'text-sky-400' : 'text-sky-500'}`}>${p[priceTier].toFixed(2)}</span>
                                      <span className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Stock: {p.stock}</span>
                                    </div>
                                  </div>
                                  <span className="text-sky-500 text-xl opacity-0 group-hover:opacity-100 transition-opacity">+</span>
                                </button>
                              ))}
                            </div>
                          );
                        }
                        return (
                          <div className={`p-8 text-center ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                            <p className="text-3xl mb-2"><MagnifyingGlassIcon className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" /></p>
                            <p className="font-bold">No se encontraron productos</p>
                            <p className="text-sm">Intenta con otro término de búsqueda</p>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className={`text-[10px] font-black uppercase ${isDarkMode ? 'text-slate-500 border-slate-700' : 'text-slate-400 border-slate-50'}`}>
                      <th className="py-3 sm:py-4 text-left px-2 sm:px-4 w-10 sm:w-12"></th>
                      <th className="py-3 sm:py-4 text-left px-2 sm:px-4">Descripción</th>
                      <th className="py-3 sm:py-4 text-center w-16 sm:w-24">Cantidad</th>
                      <th className="py-3 sm:py-4 text-right w-20 sm:w-28">Unitario</th>
                      <th className="py-3 sm:py-4 text-right w-20 sm:w-28">Descuento</th>
                      <th className="py-3 sm:py-4 text-right w-20 sm:w-28">Total</th>
                      <th className="py-3 sm:py-4 w-8 sm:w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {items.map(item => (
                      <tr key={item.productId}>
                        <td className="py-4 px-4">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.description} className="w-12 h-12 rounded-lg object-cover border border-slate-200" />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center"><CubeIcon className="w-5 h-5 text-slate-400" /></div>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <p className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{item.description}</p>
                          <p className={`text-xs flex items-center gap-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-400'}`}>
                            {item.type === 'FISICO' ? <><CubeIcon className="w-3 h-3 inline" /> Producto</> : <><Cog6ToothIcon className="w-3 h-3 inline" /> Servicio</>}
                          </p>
                        </td>
                        <td className="py-4 text-center">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            className="w-16 sm:w-20 p-2 text-center font-black bg-slate-100 rounded-xl border-2 border-transparent focus:border-sky-500 focus:outline-none min-h-[40px]"
                            onChange={e => updateItem(item.productId, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                          />
                        </td>
                        <td className="py-4 text-right">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            className={`w-20 sm:w-24 p-2 text-right font-bold ${isDarkMode ? 'bg-slate-700 text-white border-slate-600' : 'bg-slate-100'} rounded-xl border-2 border-transparent focus:border-sky-500 focus:outline-none text-sm min-h-[40px]`}
                            onChange={e => updateItem(item.productId, 'unitPrice', Math.max(0, parseFloat(e.target.value) || 0))}
                          />
                        </td>
                        <td className="py-4 text-right">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.discount || 0}
                            className="w-20 sm:w-24 p-2 text-right font-bold bg-amber-50 rounded-xl border-2 border-transparent focus:border-amber-500 focus:outline-none text-amber-600 min-h-[40px]"
                            onChange={e => updateItem(item.productId, 'discount', Math.max(0, parseFloat(e.target.value) || 0))}
                            placeholder="0.00"
                          />
                        </td>
                        <td className="py-4 text-right font-black text-sky-500 px-4">${item.total.toFixed(2)}</td>
                        <td className="py-4 px-4 text-right">
                          <button type="button" onClick={() => setItems(items.filter(i => i.productId !== item.productId))} className={`${isDarkMode ? 'text-slate-500 hover:text-rose-400' : 'text-slate-300 hover:text-rose-500'} text-lg`}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {items.length === 0 && (
                  <div className={`text-center py-12 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    <p className="mb-2"><ShoppingCartIcon className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" /></p>
                    <p className="font-bold">No hay productos agregados</p>
                    <p className="text-sm">Busca y agrega productos para crear la factura</p>
                  </div>
                )}
              </div>

              {/* Detalle Textarea */}
              <div className="mt-8 space-y-2">
                <label htmlFor={`${fieldId}-additionalInfo`} className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} px-1 block`}>Detalle / Información Adicional</label>
                <textarea
                  id={`${fieldId}-additionalInfo`}
                  className={`w-full ${isDarkMode ? 'bg-slate-700 text-white border-slate-600' : 'bg-slate-50'} p-4 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-sky-500 transition-all text-sm min-h-[80px] resize-none`}
                  placeholder="Este campo permite hasta máximo 300 caracteres."
                  maxLength={300}
                  value={additionalInfo}
                  onChange={e => setAdditionalInfo(e.target.value)}
                />
              </div>
            </div>
          </>
        )}
      </div>

      <div className="space-y-6">
        {!lastDocument && (
          <div className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'} p-8 rounded-[2.5rem] shadow-sm lg:sticky lg:top-8`}>
            <h4 className={`text-[10px] font-black ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-widest mb-6 border-b pb-4`}>Cálculo de Impuestos</h4>
            <div className="space-y-4 mb-8">
              <div className={`flex justify-between text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}><span>Base Imponible</span><span>${(totals.sub15 + totals.sub0).toFixed(2)}</span></div>
              {totals.desc > 0 && (
                <div className="flex justify-between text-xs font-bold text-amber-600"><span>Descuentos</span><span>-${totals.desc.toFixed(2)}</span></div>
              )}
              <div className="flex justify-between text-xs font-black text-sky-500"><span>IVA (15%)</span><span>${totals.tax.toFixed(2)}</span></div>
              
              {/* PROPINA */}
              <div className="flex justify-between items-center pt-2">
                <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Propina</span>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={`w-24 pl-6 pr-3 py-1.5 text-right font-bold ${isDarkMode ? 'bg-slate-700 text-white' : 'bg-slate-100'} rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm`}
                    value={tip || ''}
                    onChange={e => setTip(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <p className={`text-4xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'} tracking-tighter`}>${(totals.total + tip).toFixed(2)}</p>
                <p className={`text-[9px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} font-bold uppercase tracking-widest mt-1`}>Total Comprobante</p>
              </div>
            </div>

            <button type="button"
              disabled={items.length === 0 || isSubmitting}
              onClick={() => setShowPreview(true)}
              className="w-full bg-sky-500 text-white font-black py-5 rounded-2xl hover:bg-sky-600 transition-all disabled:opacity-50 text-[10px] uppercase tracking-widest"
            >
              Conectar con SRI
            </button>

            <div className="mt-3 flex items-center justify-between px-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isProforma}
                  onChange={(e) => setIsProforma(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                />
                <span className={`text-xs font-bold ${isProforma ? 'text-amber-600' : 'text-slate-400'}`}>
                  Es Proforma (sin enviar al SRI)
                </span>
              </label>
            </div>

            {isProforma && (
              <button type="button"
                disabled={items.length === 0 || isSubmitting}
                onClick={() => setShowPreview(true)}
                className="w-full bg-amber-500 text-white font-black py-4 rounded-2xl hover:bg-amber-600 transition-all disabled:opacity-50 text-[10px] uppercase tracking-widest mt-3"
              >
                Generar Proforma
              </button>
            )}
          </div>
        )}
      </div>

      {isSubmitting && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-2xl z-[500] flex items-center justify-center p-4">
          <div className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white rounded-[3.5rem] p-10 max-w-2xl w-full space-y-8 animate-in zoom-in duration-300 shadow-2xl overflow-hidden border border-slate-200'}`}>
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 border-[6px] border-sky-50 border-t-blue-600 rounded-full animate-spin"></div>
              <div>
                <h3 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'} tracking-tight uppercase`}>Protocolo SRI en Curso</h3>
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} font-medium`}>{authStep}</p>
              </div>
            </div>

            <div className="bg-slate-900 rounded-3xl p-6 h-64 overflow-y-auto font-mono text-[10px] text-blue-300/80 space-y-1">
              {authLogs.map((l) => (
                <div key={l.id} className="flex gap-3">
                  <span className={`${isDarkMode ? 'text-slate-400' : 'text-slate-600'} flex-shrink-0`}>➜</span>
                  <span>{l.text}</span>
                </div>
              ))}
              <div className="animate-pulse">_</div>
            </div>
          </div>
        </div>
      )}

      {showPreview && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white rounded-[3.5rem] w-full max-w-2xl shadow-2xl animate-in zoom-in duration-300 overflow-hidden'}`}>
            <div className={`p-10 border-b ${isDarkMode ? 'border-slate-700' : 'border-slate-50'} flex justify-between items-center`}>
              <h2 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'} tracking-tighter uppercase`}>Confirmar Comprobante</h2>
              <button type="button" onClick={() => setShowPreview(false)} className={`${isDarkMode ? 'text-slate-400 hover:text-rose-400' : 'text-slate-400 hover:text-rose-500'}`}>✕</button>
            </div>
            <div className="p-10 space-y-6">
              <div className={`${isDarkMode ? 'bg-slate-700' : 'bg-slate-50'} p-6 rounded-3xl space-y-2`}>
                <p className={`text-[10px] font-black ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-widest`}>Ambiente Seleccionado</p>
                <p className={`font-black uppercase text-sm ${businessInfo.isProduction ? (isDarkMode ? 'text-emerald-400' : 'text-emerald-600') : (isDarkMode ? 'text-amber-400' : 'text-amber-500')}`}>
                  {businessInfo.isProduction ? 'PRODUCCIÓN (Servidor Real)' : 'PRUEBAS (Servidor Demo)'}
                </p>
              </div>
              <div className="flex justify-between items-end border-t border-slate-100 pt-6">
                <div>
                  <p className={`text-[10px] font-black ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-widest`}>A pagar</p>
                  <p className={`text-4xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>${(totals.total + tip).toFixed(2)}</p>
                </div>
                <button type="button"
                  onClick={handleProcess}
                  className="bg-sky-500 text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:scale-105 transition-all"
                >
                  Autorizar con SRI
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRide && lastDocument && (
        <RideViewer document={lastDocument} businessInfo={businessInfo} items={lastDocument.items || []} onClose={() => setShowRide(false)} />
      )}
    </div>
  );
};

export default InvoiceForm;
