import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Chart,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  DoughnutController,
  BarController,
  Title,
} from "chart.js";

Chart.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  DoughnutController,
  BarController,
  Title
);

// FIX brand colors (HSL approximations as hex for jsPDF/Chart)
const COLORS = {
  primary: "#1E3A8A", // navy
  primaryLight: "#3B82F6",
  secondary: "#0D9488", // teal
  secondaryLight: "#14B8A6",
  accent: "#D97706", // gold
  accentLight: "#F59E0B",
  success: "#16A34A",
  danger: "#DC2626",
  warning: "#EAB308",
  muted: "#94A3B8",
  bg: "#F8FAFC",
  ink: "#0F172A",
  inkSoft: "#475569",
  border: "#E2E8F0",
};

export interface ProReportData {
  profesional?: string | null;
  rubro?: string | null;
  localidad?: string | null;
  plan?: string | null;
  periodo: string;
  desde: string;
  hasta: string;
  totalSolicitudes: number;
  nuevas: number;
  aceptadasOEnServicio: number;
  finalizadas: number;
  rechazadasPorVos: number;
  canceladasPorCliente: number;
  ingresosFinalizados: number;
  ingresosConfirmados: number;
  ingresosTotales: number;
  ticketPromedio: number;
  topServicios: { name: string; count: number; revenue: number }[];
  clientesRecurrentes: number;
  horarioPico: string | null;
  tiempoRespuestaPromedioMin: number | null;
  cumplimientoHorariosPct: number | null;
  scoreMeritocracia: any;
  cantidadReseñas: number;
  ratingPromedio: string | null;
  ultimasReseñas: { rating: number; comment: string | null }[];
}

const fmtMoney = (n: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n || 0);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });

/**
 * jsPDF default fonts (Helvetica) only support WinAnsi / Latin-1.
 * Any character outside that range (★ ☆ → · … • emojis, etc.) renders as
 * garbage like "Ø=ÜÊ". This sanitizer replaces common offenders with safe
 * ASCII equivalents and strips anything else non-Latin-1.
 */
const sanitizeForPdf = (input: string): string => {
  if (!input) return "";
  return input
    .replace(/[→➔➜➞]/g, "->")
    .replace(/[←]/g, "<-")
    .replace(/[↑]/g, "^")
    .replace(/[↓]/g, "v")
    .replace(/[•●◦▪▫]/g, "-")
    .replace(/[·]/g, "-")
    .replace(/[…]/g, "...")
    .replace(/[★⭐]/g, "*")
    .replace(/[☆]/g, "o")
    .replace(/[“”«»]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/[✓✔]/g, "OK")
    .replace(/[✗✘]/g, "X")
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, "")
    .replace(/[\u{2600}-\u{27BF}]/gu, "")
    .replace(/[^\x00-\xFF]/g, "");
};

/**
 * Render a Chart.js chart on an offscreen canvas and return a PNG dataURL.
 */
async function renderChartAsImage(
  config: any,
  width = 800,
  height = 400
): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  // Required so Chart.js doesn't downscale on hi-dpi
  const ctx = canvas.getContext("2d")!;
  const chart = new Chart(ctx, {
    ...config,
    options: {
      ...(config.options || {}),
      responsive: false,
      animation: false,
      devicePixelRatio: 2,
    },
  });
  // Force one render frame
  chart.update("none");
  const url = canvas.toDataURL("image/png", 1.0);
  chart.destroy();
  return url;
}

function drawHeader(doc: jsPDF, data: ProReportData) {
  const w = doc.internal.pageSize.getWidth();
  // Top brand bar
  doc.setFillColor(COLORS.primary);
  doc.rect(0, 0, w, 28, "F");
  doc.setFillColor(COLORS.accent);
  doc.rect(0, 28, w, 2, "F");

  // Logo / brand
  doc.setTextColor("#FFFFFF");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("FIX", 14, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor("#CBD5E1");
  doc.text("Reporte profesional", 30, 18);

  // Date stamp right
  doc.setFontSize(8);
  doc.setTextColor("#E2E8F0");
  const stamp = `Generado: ${new Date().toLocaleDateString("es-AR")}`;
  doc.text(stamp, w - 14, 18, { align: "right" });
}

function drawFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  doc.setDrawColor(COLORS.border);
  doc.setLineWidth(0.3);
  doc.line(14, h - 14, w - 14, h - 14);
  doc.setFontSize(8);
  doc.setTextColor(COLORS.muted);
  doc.setFont("helvetica", "normal");
  doc.text("FIX — Marketplace de servicios profesionales", 14, h - 8);
  doc.text(`Página ${pageNum} de ${totalPages}`, w - 14, h - 8, { align: "right" });
}

function drawSectionTitle(doc: jsPDF, y: number, text: string, accent = COLORS.primary): number {
  doc.setFillColor(accent);
  doc.rect(14, y - 4, 3, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(COLORS.ink);
  doc.text(text, 20, y + 2);
  return y + 10;
}

function drawKpiCards(doc: jsPDF, y: number, data: ProReportData): number {
  const w = doc.internal.pageSize.getWidth();
  const margin = 14;
  const gap = 4;
  const cardW = (w - margin * 2 - gap * 3) / 4;
  const cardH = 24;

  const cards = [
    { label: "Ingresos totales", value: fmtMoney(data.ingresosTotales), color: COLORS.primary },
    { label: "Servicios finalizados", value: String(data.finalizadas), color: COLORS.secondary },
    { label: "Ticket promedio", value: fmtMoney(data.ticketPromedio), color: COLORS.accent },
    { label: "Solicitudes totales", value: String(data.totalSolicitudes), color: COLORS.inkSoft },
  ];

  cards.forEach((c, i) => {
    const x = margin + i * (cardW + gap);
    doc.setFillColor(COLORS.bg);
    doc.setDrawColor(COLORS.border);
    doc.roundedRect(x, y, cardW, cardH, 2, 2, "FD");
    // accent stripe
    doc.setFillColor(c.color);
    doc.rect(x, y, 2, cardH, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(COLORS.muted);
    doc.text(c.label.toUpperCase(), x + 5, y + 6);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(COLORS.ink);
    doc.text(c.value, x + 5, y + 16);
  });

  return y + cardH + 6;
}

/**
 * Strip markdown (headings, bold, lists, emojis-as-bullets) for clean PDF rendering.
 */
function parseMarkdownToBlocks(md: string): { type: "h" | "p" | "li"; text: string }[] {
  const lines = md.split(/\r?\n/);
  const blocks: { type: "h" | "p" | "li"; text: string }[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (/^#{1,6}\s/.test(line)) {
      blocks.push({ type: "h", text: sanitizeForPdf(line.replace(/^#{1,6}\s+\**/, "").replace(/\*+/g, "")) });
    } else if (/^[-*•]\s/.test(line)) {
      blocks.push({ type: "li", text: sanitizeForPdf(line.replace(/^[-*•]\s+/, "").replace(/\*+/g, "")) });
    } else {
      blocks.push({ type: "p", text: sanitizeForPdf(line.replace(/\*+/g, "")) });
    }
  }
  return blocks;
}

function drawAiReport(doc: jsPDF, startY: number, report: string): number {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const margin = 14;
  const maxW = w - margin * 2;
  let y = startY;

  const ensureSpace = (needed: number) => {
    if (y + needed > h - 22) {
      doc.addPage();
      drawHeader(doc, { periodo: "" } as any);
      y = 40;
    }
  };

  const blocks = parseMarkdownToBlocks(report);
  for (const b of blocks) {
    if (b.type === "h") {
      ensureSpace(12);
      y += 4;
      doc.setFillColor(COLORS.primary);
      doc.rect(margin, y - 3, 2, 6, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(COLORS.ink);
      doc.text(b.text, margin + 5, y + 2);
      y += 7;
    } else if (b.type === "li") {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(COLORS.inkSoft);
      const text = b.text;
      const lines = doc.splitTextToSize(text, maxW - 8);
      ensureSpace(lines.length * 5 + 2);
      doc.setFillColor(COLORS.accent);
      doc.circle(margin + 2, y + 1.4, 0.9, "F");
      doc.text(lines, margin + 6, y + 2);
      y += lines.length * 5 + 1;
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(COLORS.inkSoft);
      const lines = doc.splitTextToSize(b.text, maxW);
      ensureSpace(lines.length * 5 + 2);
      doc.text(lines, margin, y + 2);
      y += lines.length * 5 + 2;
    }
  }
  return y;
}

export async function generateProReportPdf(data: ProReportData, report: string) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  // ===== PAGE 1 =====
  drawHeader(doc, data);

  let y = 40;

  // Title block
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(COLORS.ink);
  doc.text(`Reporte ${data.periodo}`, 14, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(COLORS.muted);
  const subtitle =
    [data.profesional, data.rubro, data.localidad].filter(Boolean).join(" - ") ||
    "Profesional FIX";
  doc.text(sanitizeForPdf(subtitle), 14, y);
  y += 5;
  doc.text(`Período: ${fmtDate(data.desde)} - ${fmtDate(data.hasta)}`, 14, y);
  y += 8;

  // KPI cards
  y = drawKpiCards(doc, y, data);

  // Score meritocracia (compact strip)
  if (data.scoreMeritocracia) {
    const s = data.scoreMeritocracia;
    doc.setFillColor(COLORS.bg);
    doc.setDrawColor(COLORS.border);
    doc.roundedRect(14, y, w - 28, 20, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(COLORS.ink);
    doc.text("Score Meritocracia", 18, y + 7);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(COLORS.primary);
    doc.text(`${s.total_score ?? "-"} / 5`, 18, y + 16);

    const metrics = [
      { l: "Velocidad", v: s.velocity },
      { l: "Confiabilidad", v: s.reliability },
      { l: "Excelencia", v: s.excellence },
      { l: "Reseñas", v: s.review_count },
    ];
    metrics.forEach((m, i) => {
      const x = 70 + i * 32;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(COLORS.muted);
      doc.text(m.l.toUpperCase(), x, y + 7);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(COLORS.ink);
      doc.text(String(m.v ?? "-"), x, y + 16);
    });
    y += 26;
  }

  // ===== Charts row =====
  y = drawSectionTitle(doc, y, "Distribución de solicitudes");

  // Chart 1: Doughnut estados
  const stateLabels = ["Finalizadas", "Confirmadas", "Pendientes", "Declinadas", "Canceladas"];
  const stateValues = [
    data.finalizadas,
    data.aceptadasOEnServicio,
    data.nuevas,
    data.rechazadasPorVos,
    data.canceladasPorCliente,
  ];
  const stateColors = [COLORS.success, COLORS.secondary, COLORS.warning, COLORS.danger, COLORS.muted];

  const hasStateData = stateValues.some((v) => v > 0);
  const doughnutImg = hasStateData
    ? await renderChartAsImage(
        {
          type: "doughnut",
          data: {
            labels: stateLabels,
            datasets: [
              {
                data: stateValues,
                backgroundColor: stateColors,
                borderColor: "#FFFFFF",
                borderWidth: 2,
              },
            ],
          },
          options: {
            plugins: {
              legend: { position: "right", labels: { font: { size: 14 }, color: COLORS.ink } },
            },
            cutout: "55%",
          },
        },
        700,
        420
      )
    : null;

  // Chart 2: Bar top servicios (revenue)
  const topSvc = data.topServicios.slice(0, 5);
  const barImg = topSvc.length
    ? await renderChartAsImage(
        {
          type: "bar",
          data: {
            labels: topSvc.map((s) => s.name.length > 18 ? s.name.slice(0, 17) + "…" : s.name),
            datasets: [
              {
                label: "Ingresos ($)",
                data: topSvc.map((s) => s.revenue),
                backgroundColor: COLORS.primary,
                borderRadius: 4,
              },
            ],
          },
          options: {
            indexAxis: "y",
            plugins: {
              legend: { display: false },
              title: {
                display: true,
                text: "Top servicios por facturación",
                color: COLORS.ink,
                font: { size: 14, weight: "bold" },
              },
            },
            scales: {
              x: {
                ticks: {
                  color: COLORS.inkSoft,
                  callback: (v: any) => "$" + Number(v).toLocaleString("es-AR"),
                },
                grid: { color: COLORS.border },
              },
              y: { ticks: { color: COLORS.ink, font: { size: 12 } }, grid: { display: false } },
            },
          },
        },
        700,
        420
      )
    : null;

  const colW = (w - 14 * 2 - 6) / 2;
  const chartH = 60;
  if (doughnutImg) {
    doc.addImage(doughnutImg, "PNG", 14, y, colW, chartH);
  } else {
    doc.setDrawColor(COLORS.border);
    doc.setFillColor(COLORS.bg);
    doc.roundedRect(14, y, colW, chartH, 2, 2, "FD");
    doc.setTextColor(COLORS.muted);
    doc.setFontSize(9);
    doc.text("Sin datos en el período", 14 + colW / 2, y + chartH / 2, { align: "center" });
  }
  if (barImg) {
    doc.addImage(barImg, "PNG", 14 + colW + 6, y, colW, chartH);
  } else {
    doc.setDrawColor(COLORS.border);
    doc.setFillColor(COLORS.bg);
    doc.roundedRect(14 + colW + 6, y, colW, chartH, 2, 2, "FD");
    doc.setTextColor(COLORS.muted);
    doc.setFontSize(9);
    doc.text("Sin servicios finalizados", 14 + colW + 6 + colW / 2, y + chartH / 2, { align: "center" });
  }
  y += chartH + 8;

  // ===== Operación =====
  y = drawSectionTitle(doc, y, "Operación", COLORS.secondary);

  const opRows = [
    ["Tiempo de respuesta promedio", data.tiempoRespuestaPromedioMin != null ? `${data.tiempoRespuestaPromedioMin} min` : "—"],
    ["Cumplimiento de horarios", data.cumplimientoHorariosPct != null ? `${data.cumplimientoHorariosPct}%` : "—"],
    ["Horario pico", data.horarioPico ?? "—"],
    ["Clientes recurrentes", String(data.clientesRecurrentes)],
    ["Reseñas recibidas", `${data.cantidadReseñas}${data.ratingPromedio ? `  -  ${data.ratingPromedio} *` : ""}`],
    ["Ingresos confirmados", fmtMoney(data.ingresosConfirmados)],
    ["Ingresos finalizados", fmtMoney(data.ingresosFinalizados)],
  ];

  autoTable(doc, {
    startY: y,
    body: opRows,
    theme: "plain",
    styles: { fontSize: 9.5, cellPadding: 2.5, textColor: COLORS.ink },
    columnStyles: {
      0: { textColor: COLORS.muted, fontStyle: "normal", cellWidth: 70 },
      1: { fontStyle: "bold", textColor: COLORS.ink },
    },
    didDrawCell: (hookData) => {
      if (hookData.column.index === 0 && hookData.section === "body") {
        const yy = hookData.cell.y + hookData.cell.height;
        doc.setDrawColor(COLORS.border);
        doc.setLineWidth(0.1);
        doc.line(14, yy, w - 14, yy);
      }
    },
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ===== PAGE 2: Servicios estrella + AI Report =====
  if (topSvc.length) {
    if (y > h - 80) {
      doc.addPage();
      drawHeader(doc, data);
      y = 40;
    }
    y = drawSectionTitle(doc, y, "Servicios estrella", COLORS.accent);
    autoTable(doc, {
      startY: y,
      head: [["Servicio", "Pedidos", "Facturado", "Ticket prom."]],
      body: topSvc.map((s) => [
        s.name,
        String(s.count),
        fmtMoney(s.revenue),
        fmtMoney(s.count > 0 ? Math.round(s.revenue / s.count) : 0),
      ]),
      theme: "striped",
      headStyles: {
        fillColor: COLORS.primary,
        textColor: "#FFFFFF",
        fontSize: 9,
        fontStyle: "bold",
      },
      bodyStyles: { fontSize: 9, textColor: COLORS.ink },
      alternateRowStyles: { fillColor: COLORS.bg },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Reseñas
  if (data.ultimasReseñas?.length) {
    if (y > h - 60) {
      doc.addPage();
      drawHeader(doc, data);
      y = 40;
    }
    y = drawSectionTitle(doc, y, "Últimas reseñas", COLORS.secondary);
    data.ultimasReseñas.forEach((r) => {
      const filled = Math.max(0, Math.min(5, r.rating));
      const stars = `${r.rating}/5  ` + "*".repeat(filled) + ".".repeat(5 - filled);
      doc.setFillColor(COLORS.bg);
      doc.setDrawColor(COLORS.border);
      const text = sanitizeForPdf(r.comment || "(Sin comentario)");
      const lines = doc.splitTextToSize(text, w - 28 - 6);
      const boxH = Math.max(14, 8 + lines.length * 4.5);
      if (y + boxH > h - 22) {
        doc.addPage();
        drawHeader(doc, data);
        y = 40;
      }
      doc.roundedRect(14, y, w - 28, boxH, 2, 2, "FD");
      doc.setFillColor(COLORS.accent);
      doc.rect(14, y, 2, boxH, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(COLORS.accent);
      doc.text(stars, 18, y + 6);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(COLORS.inkSoft);
      doc.text(lines, 18, y + 11);
      y += boxH + 3;
    });
    y += 4;
  }

  // ===== AI Analysis on its own page =====
  doc.addPage();
  drawHeader(doc, data);
  y = 40;
  y = drawSectionTitle(doc, y, "Análisis inteligente", COLORS.primary);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(COLORS.muted);
  doc.text("Generado por inteligencia artificial sobre tus datos del período.", 14, y);
  y += 6;
  drawAiReport(doc, y, report);

  // Footer pagination
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    drawFooter(doc, i, total);
  }

  const safeName = (data.profesional || "profesional").replace(/[^a-z0-9]+/gi, "_").toLowerCase();
  const safePeriod = data.periodo.replace(/\s+/g, "_");
  const filename = `FIX_reporte_${safeName}_${safePeriod}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
