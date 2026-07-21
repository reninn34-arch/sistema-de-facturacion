/**
 * Servicio de exportación a Excel / CSV estructurado con soporte UTF-8 completo.
 * Formatea automáticamente montos, fechas y textos conservando caracteres especiales de Ecuador (ñ, tildes).
 */

export interface ExcelColumn<T> {
  header: string;
  accessor: (item: T) => string | number | boolean | null | undefined;
}

export const exportToExcelCSV = <T>(
  filename: string,
  title: string,
  columns: ExcelColumn<T>[],
  data: T[],
  summaryRows?: { label: string; value: string | number }[]
) => {
  const sanitize = (val: any): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const lines: string[] = [];

  // Título e información corporativa
  lines.push(`"${title.toUpperCase()}"`);
  lines.push(`"Fecha de exportación: ${new Date().toLocaleString('es-EC')}"`);
  lines.push(''); // línea vacía

  // Cabeceras de columnas
  const headers = columns.map(c => sanitize(c.header)).join(';');
  lines.push(headers);

  // Filas de datos
  data.forEach(item => {
    const row = columns.map(col => sanitize(col.accessor(item))).join(';');
    lines.push(row);
  });

  // Filas de resumen / totales
  if (summaryRows && summaryRows.length > 0) {
    lines.push('');
    summaryRows.forEach(summary => {
      lines.push(`${sanitize(summary.label)};${sanitize(summary.value)}`);
    });
  }

  // BOM UTF-8 (\uFEFF) para que Excel abra directamente con tildes y eñes impecables
  const csvContent = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename.endsWith('.csv') ? filename : filename + '.csv'}`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
