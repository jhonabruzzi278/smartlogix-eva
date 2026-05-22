const BOM = "\uFEFF";

const escapeField = (value: string | number): string =>
  `"${String(value).replace(/"/g, '""').replace(/^[=+\-@]/, "'$&")}"`;

const toLine = (values: (string | number)[]): string =>
  values.map(escapeField).join(",") + "\n";

const triggerDownload = (content: string, filename: string): void => {
  const blob = new Blob([BOM + content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

export interface ColumnDef<T> {
  header: string;
  accessor: (row: T) => string | number;
}

const today = () => new Date().toISOString().slice(0, 10);

export function exportCSV<T>(rows: T[], columns: ColumnDef<T>[], filename: string): void {
  const header = toLine(columns.map((c) => c.header));
  const body = rows.reduce((csv, row) => csv + toLine(columns.map((c) => c.accessor(row))), "");
  triggerDownload(header + body, filename);
}

export const orderColumns: ColumnDef<{
  id: string;
  customer: string;
  sku: string;
  quantity: number;
  stage: string;
  createdAt: string;
  transporter?: string;
}>[] = [
  { header: "ID", accessor: (o) => o.id },
  { header: "Cliente", accessor: (o) => o.customer },
  { header: "SKU", accessor: (o) => o.sku },
  { header: "Cantidad", accessor: (o) => o.quantity },
  { header: "Estado", accessor: (o) => o.stage },
  { header: "Transportista", accessor: (o) => o.transporter ?? "" },
  { header: "Creado", accessor: (o) => o.createdAt }
];

export const inventoryColumns: ColumnDef<{
  sku: string;
  stock: number;
  status: string;
  updatedAt: string;
}>[] = [
  { header: "SKU", accessor: (p) => p.sku },
  { header: "Stock", accessor: (p) => p.stock },
  { header: "Estado", accessor: (p) => p.status },
  { header: "Actualizado", accessor: (p) => p.updatedAt }
];

export const shipmentColumns: ColumnDef<{
  id: string;
  tracking: string;
  orderId: string;
  sku: string;
  stage: string;
  carrier: string;
  createdAt: string;
}>[] = [
  { header: "ID", accessor: (s) => s.id },
  { header: "Tracking", accessor: (s) => s.tracking },
  { header: "Pedido", accessor: (s) => s.orderId },
  { header: "SKU", accessor: (s) => s.sku },
  { header: "Estado", accessor: (s) => s.stage.replace(/_/g, " ") },
  { header: "Transportista", accessor: (s) => s.carrier },
  { header: "Creado", accessor: (s) => s.createdAt }
];

export function exportOrdersCSV(orders: Array<{ id: string; customer: string; sku: string; quantity: number; stage: string; createdAt: string; transporter?: string }>) {
  exportCSV(orders, orderColumns, `pedidos-${today()}.csv`);
}

export function exportInventoryCSV(products: Array<{ sku: string; stock: number; status: string; updatedAt: string }>) {
  exportCSV(products, inventoryColumns, `inventario-${today()}.csv`);
}

export function exportShipmentsCSV(shipments: Array<{ id: string; tracking: string; orderId: string; sku: string; stage: string; carrier: string; createdAt: string }>) {
  exportCSV(shipments, shipmentColumns, `envios-${today()}.csv`);
}

export const salesColumns: ColumnDef<{
  id: string;
  items: string;
  vendorName: string;
  total: number;
  paymentMethod: string;
  createdAt: string;
}>[] = [
  { header: "Venta #", accessor: (s) => s.id },
  { header: "Items", accessor: (s) => s.items },
  { header: "Vendedor", accessor: (s) => s.vendorName },
  { header: "Total", accessor: (s) => s.total },
  { header: "Pago", accessor: (s) => s.paymentMethod },
  { header: "Fecha", accessor: (s) => s.createdAt },
];

export function exportSalesCSV(sales: Array<{ id: string; items: string; vendorName: string; total: number; paymentMethod: string; createdAt: string }>) {
  exportCSV(sales, salesColumns, `ventas-${today()}.csv`);
}
