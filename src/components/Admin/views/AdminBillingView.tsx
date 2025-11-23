import { CreditCard, Download } from 'lucide-react';
import { StripePayment } from '../../../lib/supabase';
import { DataTable, ColumnDefinition, FilterDefinition } from '../components/DataTable';
import { logInfo } from '../../../observability';

interface AdminBillingViewProps {
  payments: StripePayment[];
}

export function AdminBillingView({ payments }: AdminBillingViewProps) {
  const columns: ColumnDefinition<StripePayment>[] = [
    { key: 'id', label: 'ID' },
    { key: 'customer_email', label: 'Cliente' },
    {
      key: 'amount',
      label: 'Importe',
      render: row => `${(row.amount / 100).toFixed(2)} ${row.currency || '€'}`,
    },
    { key: 'status', label: 'Estado' },
    { key: 'invoice_id', label: 'Factura' },
    {
      key: 'created_at',
      label: 'Fecha',
      render: row => new Date(row.created_at).toLocaleString(),
    },
  ];

  const filters: FilterDefinition<StripePayment>[] = [
    {
      key: 'status',
      label: 'Estado',
      options: [
        { label: 'Completado', value: 'succeeded' },
        { label: 'Pendiente', value: 'pending' },
        { label: 'Fallido', value: 'failed' },
      ],
    },
  ];

  const bulkActions = [
    {
      label: 'Exportar selección',
      onAction: (rows: StripePayment[]) => {
        logInfo('Exportar pagos seleccionados', { ids: rows.map(r => r.id) });
      },
    },
    {
      label: 'Reintentar cobranza',
      onAction: (rows: StripePayment[]) => {
        logInfo('Reintento de cobro vía Stripe', { ids: rows.map(r => r.id) });
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-indigo-600 font-semibold">Facturación</p>
          <h2 className="text-2xl font-bold text-slate-900">Pagos y créditos</h2>
          <p className="text-sm text-slate-600">Datos en vivo desde las tablas stripe_* para trazabilidad.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-500 transition-colors">
          <Download className="w-4 h-4" />
          Exportar CSV
        </button>
      </div>

      <DataTable
        data={payments}
        columns={columns}
        filters={filters}
        rowKey={row => row.id}
        bulkActions={bulkActions}
        emptyState="No hay pagos registrados"
      />

      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-start gap-3">
        <CreditCard className="w-5 h-5 text-indigo-600 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-indigo-700">Stripe en modo gobernado</p>
          <p className="text-sm text-indigo-800">
            Este panel rastrea stripe_payments e invoice_id para cada movimiento y preserva la relación con audit_logs.
          </p>
        </div>
      </div>
    </div>
  );
}
