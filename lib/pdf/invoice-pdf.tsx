import { Document, Page, Text, View, Image, Font, StyleSheet } from "@react-pdf/renderer";
import fs from "fs";
import path from "path";
import type { Business, Customer, Invoice, InvoiceItem } from "@/lib/types";
import { PAYMENT_STATUS_LABELS } from "@/lib/types";

let fontsRegistered = false;

/**
 * تسجيل الخط العربي مرة واحدة فقط لكل عملية Node. يتطلب وجود ملفات
 * TTF محليًا (راجع README → قسم "خط PDF العربي" لخطوات التحميل، لأن
 * بيئة التطوير الحالية بدون اتصال إنترنت لتحميلها تلقائيًا).
 */
function registerFonts() {
  if (fontsRegistered) return;

  const regularPath = path.join(process.cwd(), "public/fonts/Tajawal-Regular.ttf");
  const boldPath = path.join(process.cwd(), "public/fonts/Tajawal-Bold.ttf");

  if (!fs.existsSync(regularPath) || !fs.existsSync(boldPath)) {
    throw new Error(
      "ملفات الخط العربي غير موجودة في public/fonts/. راجع README لخطوات التحميل قبل توليد PDF."
    );
  }

  Font.register({
    family: "Tajawal",
    fonts: [
      { src: regularPath, fontWeight: "normal" },
      { src: boldPath, fontWeight: "bold" },
    ],
  });

  fontsRegistered = true;
}

const styles = StyleSheet.create({
  page: {
    fontFamily: "Tajawal",
    fontSize: 10,
    padding: 32,
    direction: "rtl",
  },
  headerRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  logo: { width: 64, height: 64, objectFit: "contain" },
  businessName: { fontSize: 16, fontWeight: "bold", textAlign: "right" },
  smallText: { fontSize: 9, color: "#555", textAlign: "right", marginTop: 2 },
  invoiceTitle: { fontSize: 20, fontWeight: "bold", textAlign: "left" },
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 9,
    color: "#888",
    marginBottom: 4,
    textAlign: "right",
  },
  row: { flexDirection: "row-reverse", justifyContent: "space-between" },
  table: { marginTop: 8, borderTop: "1px solid #ddd" },
  tableHeaderRow: {
    flexDirection: "row-reverse",
    backgroundColor: "#f3f4f6",
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: "row-reverse",
    borderBottom: "1px solid #eee",
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  colName: { flex: 3, textAlign: "right" },
  colQty: { flex: 1, textAlign: "center" },
  colPrice: { flex: 1.5, textAlign: "center" },
  colSubtotal: { flex: 1.5, textAlign: "center" },
  totalsBox: { marginTop: 16, alignSelf: "flex-start", minWidth: 200 },
  totalsRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  grandTotalRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderTop: "1px solid #333",
    marginTop: 4,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 32,
    right: 32,
    textAlign: "center",
    fontSize: 8,
    color: "#999",
  },
});

export function InvoicePdfDocument({
  business,
  customer,
  invoice,
  items,
}: {
  business: Business;
  customer: Customer;
  invoice: Invoice;
  items: InvoiceItem[];
}) {
  registerFonts();

  const money = (n: number) =>
    `${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${business.currency}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={{ maxWidth: 260 }}>
            {business.logo_url && (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={business.logo_url} style={styles.logo} />
            )}
            <Text style={styles.businessName}>{business.name}</Text>
            {business.phone && <Text style={styles.smallText}>{business.phone}</Text>}
            {business.email && <Text style={styles.smallText}>{business.email}</Text>}
            {business.address && <Text style={styles.smallText}>{business.address}</Text>}
            {business.tax_number && (
              <Text style={styles.smallText}>الرقم الضريبي: {business.tax_number}</Text>
            )}
          </View>
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.smallText}>{invoice.invoice_number}</Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>فاتورة إلى</Text>
            <Text>{customer.name}</Text>
            {customer.phone && <Text style={styles.smallText}>{customer.phone}</Text>}
            {customer.address && <Text style={styles.smallText}>{customer.address}</Text>}
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>تاريخ الإصدار</Text>
            <Text>{new Date(invoice.issue_date).toLocaleDateString("ar-EG")}</Text>
            {invoice.due_date && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: 8 }]}>تاريخ الاستحقاق</Text>
                <Text>{new Date(invoice.due_date).toLocaleDateString("ar-EG")}</Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.colName, { fontWeight: "bold" }]}>المنتج</Text>
            <Text style={[styles.colQty, { fontWeight: "bold" }]}>الكمية</Text>
            <Text style={[styles.colPrice, { fontWeight: "bold" }]}>السعر</Text>
            <Text style={[styles.colSubtotal, { fontWeight: "bold" }]}>الإجمالي</Text>
          </View>
          {items.map((item) => (
            <View key={item.id} style={styles.tableRow}>
              <Text style={styles.colName}>{item.name}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colPrice}>{money(Number(item.unit_price))}</Text>
              <Text style={styles.colSubtotal}>{money(Number(item.subtotal))}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsBox}>
          <View style={styles.totalsRow}>
            <Text>{money(Number(invoice.subtotal))}</Text>
            <Text>الإجمالي الفرعي</Text>
          </View>
          {Number(invoice.discount) > 0 && (
            <View style={styles.totalsRow}>
              <Text>- {money(Number(invoice.discount))}</Text>
              <Text>الخصم</Text>
            </View>
          )}
          {Number(invoice.tax) > 0 && (
            <View style={styles.totalsRow}>
              <Text>{money(Number(invoice.tax))}</Text>
              <Text>الضريبة</Text>
            </View>
          )}
          <View style={styles.grandTotalRow}>
            <Text style={{ fontWeight: "bold" }}>{money(Number(invoice.total))}</Text>
            <Text style={{ fontWeight: "bold" }}>الإجمالي</Text>
          </View>
        </View>

        <View style={{ marginTop: 8 }}>
          <Text style={styles.sectionTitle}>
            حالة الدفع: {PAYMENT_STATUS_LABELS[invoice.payment_status]}
          </Text>
        </View>

        {invoice.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ملاحظات</Text>
            <Text>{invoice.notes}</Text>
          </View>
        )}

        <Text style={styles.footer}>
          تم الإصدار عبر SmartInvoice AI — {business.name}
        </Text>
      </Page>
    </Document>
  );
}
