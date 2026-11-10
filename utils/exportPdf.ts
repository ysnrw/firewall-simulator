import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FirewallRule, SimulationLog } from '@/types/firewall';

// Interface untuk menambahkan properti lastAutoTable dari jspdf-autotable secara type-safe
interface jsPDFWithAutoTable extends jsPDF {
  lastAutoTable?: {
    finalY: number;
  };
}

export const exportSimulationPDF = (
  rules: FirewallRule[], 
  logs: SimulationLog[], 
  bannedIps: string[]
) => {
  if (logs.length === 0) {
    alert("Tidak ada log simulasi untuk diekspor.");
    return;
  }

  // Cast instance jsPDF ke interface yang sudah diperluas
  const doc = new jsPDF() as jsPDFWithAutoTable;
  
  // Header Dokumen
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Laporan Simulasi Hierarchical Firewall", 14, 22);
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(`Waktu Ekspor: ${new Date().toLocaleString()}`, 14, 30);
  doc.text("Arsitektur: 3-Tier Security Zone, Broadcast Scan & IP Blacklist", 14, 36);

  // --- 1. TABEL BLACKLIST ---
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Daftar IP Terlarang (Blacklist)", 14, 50);
  
  const blacklistData = bannedIps.length > 0 
    ? bannedIps.map((ip, i) => [(i + 1).toString(), ip]) 
    : [['-', 'Tidak ada IP terlarang']];

  autoTable(doc, {
    startY: 55,
    head: [['No', 'Alamat IP (Banned)']],
    body: blacklistData,
    theme: 'grid',
    headStyles: { fillColor: [220, 38, 38] }, // Merah
  });

  // --- 2. TABEL RULES ---
  // Penggunaan doc.lastAutoTable?.finalY tanpa casting 'any'
  let finalY = doc.lastAutoTable?.finalY || 55;
  
  doc.text("Aturan (Rules) Aktif", 14, finalY + 15);
  
  const ruleData = rules.map((r, index) => [
    (index + 1).toString(),
    r.action,
    r.destination,
    r.port.toString(),
    r.sourceIp
  ]);

  autoTable(doc, {
    startY: finalY + 20,
    head: [['No', 'Action', 'Target Zone', 'Port', 'Source IP']],
    body: ruleData,
    theme: 'grid',
    headStyles: { fillColor: [8, 145, 178] }, // Cyan
  });

  // --- 3. TABEL LOG PENGUJIAN LENGKAP ---
  finalY = doc.lastAutoTable?.finalY || (finalY + 20);
  
  doc.text("Riwayat Pengujian Detail (Broadcast Log)", 14, finalY + 15);
  
  // Ambil log aktivitas (selain info umum, atau tampilkan semua dengan format bersih)
  const filteredLogs = logs.filter(l => l.status !== 'INFO');
  
  const logData = filteredLogs.map((l, index) => {
    // Ekstraksi informasi dari pesan log secara otomatis agar masuk ke kolom terpisah
    const message = l.message;
    return [
      (filteredLogs.length - index).toString(),
      l.timestamp,
      l.status,
      message // Memuat informasi lengkap dari log terminal
    ];
  });

  autoTable(doc, {
    startY: finalY + 20,
    head: [['No', 'Waktu', 'Status Hasil', 'Detail Keterangan & Parameter']],
    body: logData,
    theme: 'striped',
    headStyles: { fillColor: [71, 85, 105] }, // Slate
    columnStyles: {
      3: { cellWidth: 95 }
    },
    didParseCell: function(data) {
      if (data.section === 'body' && data.column.index === 2) {
        if (data.cell.raw === 'SUCCESS') {
          data.cell.styles.textColor = [34, 197, 94]; // Hijau
          data.cell.styles.fontStyle = 'bold';
        } else if (data.cell.raw === 'BLOCKED') {
          data.cell.styles.textColor = [239, 68, 68]; // Merah
          data.cell.styles.fontStyle = 'bold';
        }
      }
    }
  });

  doc.save("Laporan_Firewall_Hierarchical.pdf");
};