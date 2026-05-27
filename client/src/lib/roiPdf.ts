/**
 * ROI PDF Report Generator — Client-side branded PDF export
 */
import { jsPDF } from "jspdf";

interface ROIData {
  teamSize: number;
  avgSalary: number;
  trainingSpend: number;
  attritionRate: number;
  attritionSaving: number;
  trainingSaving: number;
  productivityGain: number;
  hrTimeSaving: number;
  totalAnnualSaving: number;
  annualPlatformCost: number;
  netSaving: number;
  roiMultiple: number;
  paybackMonths: number;
  email?: string;
  company?: string;
}

const NAVY = "#0A1628";
const GREEN = "#22C55E";
const GOLD = "#C8A96E";
const SLATE = "#64748B";
const LIGHT_BG = "#F8FAFC";
const BORDER = "#E2E8F0";

function fmt(n: number): string {
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `£${(n / 1_000).toFixed(0)}k`;
  return `£${n.toFixed(0)}`;
}

export function generateROIPdf(data: ROIData): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  const margin = 20;
  const contentW = W - margin * 2;
  let y = 0;

  // --- Header bar ---
  doc.setFillColor(NAVY);
  doc.rect(0, 0, W, 38, "F");
  doc.setTextColor("#FFFFFF");
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("AiQ", margin, 18);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(GREEN);
  doc.text("Enterprise HR Capability Intelligence", margin, 26);
  doc.setTextColor("#94A3B8");
  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`, W - margin, 18, { align: "right" });
  if (data.company) {
    doc.text(`Prepared for: ${data.company}`, W - margin, 24, { align: "right" });
  }

  y = 48;

  // --- Title ---
  doc.setTextColor(NAVY);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("ROI Projection Report", margin, y);
  y += 8;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(SLATE);
  doc.text("Projected annual value from deploying AiQ across your organisation", margin, y);
  y += 14;

  // --- Key Metrics Row ---
  const metricBoxW = contentW / 3;
  const metrics = [
    { label: "Annual Savings", value: fmt(data.totalAnnualSaving), color: GREEN },
    { label: "ROI Multiple", value: `${data.roiMultiple.toFixed(1)}x`, color: GOLD },
    { label: "Payback Period", value: `${data.paybackMonths} months`, color: "#6366F1" },
  ];

  doc.setFillColor(LIGHT_BG);
  doc.roundedRect(margin, y, contentW, 28, 3, 3, "F");
  doc.setDrawColor(BORDER);
  doc.roundedRect(margin, y, contentW, 28, 3, 3, "S");

  metrics.forEach((m, i) => {
    const x = margin + i * metricBoxW + metricBoxW / 2;
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(m.color);
    doc.text(m.value, x, y + 13, { align: "center" });
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(SLATE);
    doc.text(m.label, x, y + 21, { align: "center" });
  });
  y += 38;

  // --- Input Parameters ---
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(NAVY);
  doc.text("Your Organisation Profile", margin, y);
  y += 7;

  const inputs = [
    { label: "Team size", value: `${data.teamSize.toLocaleString()} people` },
    { label: "Average salary", value: `£${data.avgSalary.toLocaleString()}` },
    { label: "Annual training spend", value: `£${data.trainingSpend.toLocaleString()}` },
    { label: "Current attrition rate", value: `${data.attritionRate}%` },
  ];

  doc.setFillColor(LIGHT_BG);
  doc.roundedRect(margin, y, contentW, inputs.length * 8 + 4, 2, 2, "F");

  inputs.forEach((inp, i) => {
    const rowY = y + 6 + i * 8;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(SLATE);
    doc.text(inp.label, margin + 5, rowY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(NAVY);
    doc.text(inp.value, W - margin - 5, rowY, { align: "right" });
  });
  y += inputs.length * 8 + 12;

  // --- Value Breakdown ---
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(NAVY);
  doc.text("Value Breakdown", margin, y);
  y += 8;

  const drivers = [
    { label: "Reduced attrition costs", value: data.attritionSaving, desc: "55% reduction in AI-capable role turnover through targeted development" },
    { label: "Training efficiency gains", value: data.trainingSaving, desc: "60% recovery of wasted generic training spend through precision targeting" },
    { label: "Productivity uplift", value: data.productivityGain, desc: "3.2% per readiness point × 37pp average improvement" },
    { label: "HR time savings", value: data.hrTimeSaving, desc: "8 hours saved per employee per year through automated assessment and planning" },
  ];

  const maxVal = Math.max(...drivers.map((d) => d.value));

  drivers.forEach((d) => {
    // Bar
    const barW = (d.value / maxVal) * (contentW - 60);
    doc.setFillColor(GREEN);
    doc.roundedRect(margin, y, barW, 5, 1.5, 1.5, "F");

    // Label + value
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(NAVY);
    doc.text(d.label, margin, y + 12);
    doc.setTextColor(GREEN);
    doc.text(fmt(d.value), W - margin, y + 12, { align: "right" });

    // Description
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(SLATE);
    doc.text(d.desc, margin, y + 17);
    y += 24;
  });

  // --- Net calculation ---
  y += 4;
  doc.setDrawColor(BORDER);
  doc.line(margin, y, W - margin, y);
  y += 8;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(SLATE);
  doc.text("Total annual value", margin, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(GREEN);
  doc.text(fmt(data.totalAnnualSaving), W - margin, y, { align: "right" });
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(SLATE);
  doc.text("Platform investment", margin, y);
  doc.setTextColor("#DC2626");
  doc.text(`-${fmt(data.annualPlatformCost)}`, W - margin, y, { align: "right" });
  y += 7;

  doc.setDrawColor(NAVY);
  doc.line(margin + contentW * 0.6, y - 2, W - margin, y - 2);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(NAVY);
  doc.text("Net annual saving", margin, y + 4);
  doc.setFontSize(12);
  doc.setTextColor(GREEN);
  doc.text(fmt(data.netSaving), W - margin, y + 4, { align: "right" });
  y += 16;

  // --- Model Assumptions ---
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(NAVY);
  doc.text("Model Assumptions", margin, y);
  y += 7;

  const assumptions = [
    "Attrition reduction: 55% based on targeted development reducing flight risk (Deloitte 2024 benchmark)",
    "Training waste: 65% of generic L&D spend misallocated; AiQ targeting recovers 60% (McKinsey 2023)",
    "Productivity: 3.2% uplift per readiness point, based on AI-augmented workflow studies",
    "HR time: 8 hours/employee/year saved through automated assessment, planning, and reporting",
    "Platform cost: £12/employee/month (beta pricing, volume discounts available)",
  ];

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(SLATE);
  assumptions.forEach((a) => {
    doc.text(`• ${a}`, margin + 2, y, { maxWidth: contentW - 4 });
    y += 5.5;
  });

  // --- Footer ---
  y = 275;
  doc.setDrawColor(BORDER);
  doc.line(margin, y, W - margin, y);
  y += 5;
  doc.setFontSize(7);
  doc.setTextColor("#94A3B8");
  doc.text("This report is generated by AiQ's ROI modelling engine. Projections are estimates based on industry benchmarks and may vary.", margin, y);
  y += 4;
  doc.text("For a detailed implementation plan and tailored pricing, contact us at hello@hraiq.co.uk", margin, y);
  y += 4;
  doc.setTextColor(GREEN);
  doc.text("hraiq.co.uk", margin, y);

  // Save
  const filename = data.company
    ? `AiQ-ROI-Report-${data.company.replace(/[^a-zA-Z0-9]/g, "-")}.pdf`
    : "AiQ-ROI-Report.pdf";
  doc.save(filename);
}
