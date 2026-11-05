import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ExportColumn {
  header: string;
  dataKey: string;
}

/**
 * Exporta una colección de datos a una hoja de cálculo Excel (.xlsx)
 */
export function exportToExcel(data: any[], filename: string, sheetName: string = 'Datos') {
  try {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${filename}.xlsx`);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    alert('Ocurrió un error al generar el archivo Excel.');
  }
}

/**
 * Exporta una tabla con cabeceras formateadas a PDF
 */
export function exportToPDF(
  columns: ExportColumn[],
  data: any[],
  title: string,
  filename: string,
  companyHeader: string = 'FINTECH — GESTIÓN DE CARTERA Y PRÉSTAMOS'
) {
  try {
    const doc = new jsPDF('landscape');

    // Título institucional
    doc.setFontSize(14);
    doc.setTextColor(185, 28, 28); // Fintech Dark Red #b91c1c
    doc.text(companyHeader, 14, 15);

    doc.setFontSize(11);
    doc.setTextColor(24, 24, 27);
    doc.text(title, 14, 22);

    doc.setFontSize(8);
    doc.setTextColor(113, 113, 122);
    doc.text(`Generado el: ${new Date().toLocaleString('es-CO')}`, 14, 27);

    // Formatear filas
    const tableRows = data.map((item) => {
      return columns.map((col) => item[col.dataKey] ?? '');
    });

    autoTable(doc, {
      startY: 32,
      head: [columns.map((c) => c.header)],
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: [185, 28, 28],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [30, 41, 59],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      margin: { left: 14, right: 14 },
    });

    doc.save(`${filename}.pdf`);
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    alert('Ocurrió un error al generar el archivo PDF.');
  }
}
