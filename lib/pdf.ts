import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Prescription, Patient, Doctor } from './types';

export function generatePrescriptionPDF(
  prescription: Prescription,
  patient: Patient,
  doctor: Doctor
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // ── Header / Letterhead ──────────────────────────────────────
  doc.setFillColor(23, 128, 117);
  doc.rect(0, 0, pageWidth, 45, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(doctor.clinic_name, pageWidth / 2, 16, { align: 'center' });
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`${doctor.name}  |  ${doctor.specialization}`, pageWidth / 2, 26, { align: 'center' });
  const contactLine = [doctor.phone, doctor.email].filter(Boolean).join('  |  ');
  doc.text(contactLine, pageWidth / 2, 34, { align: 'center' });

  // ── Divider line ─────────────────────────────────────────────
  doc.setDrawColor(23, 128, 117);
  doc.setLineWidth(0.5);
  doc.line(15, 50, pageWidth - 15, 50);

  // ── Rx symbol ────────────────────────────────────────────────
  doc.setTextColor(23, 128, 117);
  doc.setFontSize(30);
  doc.setFont('helvetica', 'bold');
  doc.text('Rx', 15, 63);

  // ── Patient info ─────────────────────────────────────────────
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Patient: ${patient.name}`, 15, 73);
  doc.text(`ID: ${patient.display_id}  |  Age: ${patient.age}  |  Gender: ${patient.gender}`, 15, 80);
  doc.text(`Phone: ${patient.phone}`, 15, 87);

  if (patient.allergies) {
    doc.setTextColor(180, 30, 30);
    doc.setFont('helvetica', 'bold');
    doc.text(`⚠ Allergies: ${patient.allergies}`, 15, 94);
    doc.setTextColor(50, 50, 50);
    doc.setFont('helvetica', 'normal');
  }

  const prescDate = new Date(prescription.date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
  doc.text(`Date: ${prescDate}`, pageWidth - 15, 73, { align: 'right' });

  // Status badge
  const statusColors: Record<string, [number, number, number]> = {
    draft:      [180, 140, 0],
    issued:     [23, 128, 117],
    dispensed:  [50, 130, 50],
  };
  const [sr, sg, sb] = statusColors[prescription.status] || [100, 100, 100];
  doc.setFillColor(sr, sg, sb);
  doc.roundedRect(pageWidth - 50, 77, 35, 8, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text(prescription.status.toUpperCase(), pageWidth - 32.5, 83, { align: 'center' });
  doc.setTextColor(50, 50, 50);

  let currentY = patient.allergies ? 100 : 94;

  if (prescription.diagnosis) {
    currentY += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Diagnosis:', 15, currentY);
    doc.setFont('helvetica', 'normal');
    const diagLines = doc.splitTextToSize(prescription.diagnosis, pageWidth - 60);
    doc.text(diagLines, 44, currentY);
    currentY += diagLines.length * 5 + 2;
  }

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(15, currentY, pageWidth - 15, currentY);
  currentY += 6;

  // ── Medicines table (includes Strength column) ────────────────
  const hasStrength     = prescription.items.some(i => i.strength);
  const hasDescriptions = prescription.items.some(i => i.description);

  const head: string[][] = [['#', 'Medicine', ...(hasStrength ? ['Strength'] : []), ...(hasDescriptions ? ['For'] : []), 'Days', 'Times/Day', 'Notes']];
  const body = prescription.items.map((item, idx) => [
    String(idx + 1),
    item.medicineName,
    ...(hasStrength     ? [item.strength     || '-'] : []),
    ...(hasDescriptions ? [item.description  || '-'] : []),
    String(item.days),
    String(item.times_per_day),
    item.notes || '-',
  ]);

  autoTable(doc, {
    startY: currentY,
    head,
    body,
    headStyles:           { fillColor: [23, 128, 117], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    alternateRowStyles:   { fillColor: [240, 250, 248] },
    styles:               { fontSize: 9, cellPadding: 4 },
    margin:               { left: 15, right: 15 },
  });

  let finalY = (doc as any).lastAutoTable?.finalY || 150;

  if (prescription.lab_tests) {
    finalY += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(23, 128, 117);
    doc.text('Suggested Lab Tests / Reports:', 15, finalY);
    finalY += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(50, 50, 50);
    const lines = doc.splitTextToSize(prescription.lab_tests, pageWidth - 30);
    doc.text(lines, 15, finalY);
    finalY += lines.length * 5 + 2;
  }

  if (prescription.next_visit_date) {
    finalY += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(23, 128, 117);
    doc.text('Next Visit:', 15, finalY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    doc.text(
      new Date(prescription.next_visit_date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }),
      46, finalY
    );
    finalY += 4;
  }

  // ── Footer ───────────────────────────────────────────────────
  finalY += 16;
  doc.setFontSize(8.5);
  doc.setTextColor(150, 150, 150);
  doc.text('This is a computer-generated prescription.', pageWidth / 2, finalY, { align: 'center' });
  doc.text(`Generated on ${new Date().toLocaleDateString('en-PK')}`, pageWidth / 2, finalY + 5, { align: 'center' });

  doc.setDrawColor(100, 100, 100);
  doc.line(pageWidth - 70, finalY + 20, pageWidth - 15, finalY + 20);
  doc.setFontSize(9.5);
  doc.setTextColor(80, 80, 80);
  doc.text("Doctor's Signature", pageWidth - 42, finalY + 27, { align: 'center' });

  doc.save(`Rx_${patient.name.replace(/\s/g, '_')}_${prescription.date}.pdf`);
}
