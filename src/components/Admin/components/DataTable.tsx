import { ReactNode, useMemo, useState } from 'react';
import { CheckSquare, Filter, Search, Square } from 'lucide-react';

export interface ColumnDefinition<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => ReactNode;
}

export interface FilterDefinition<T> {
  key: keyof T;
  label: string;
  options: { label: string; value: string }[];
}

export interface BulkAction<T> {
  label: string;
  onAction: (rows: T[]) => void;
}

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDefinition<T>[];
  rowKey: (row: T) => string;
  filters?: FilterDefinition<T>[];
  bulkActions?: BulkAction<T>[];
  emptyState?: ReactNode;
}

export function DataTable<T>({ data, columns, rowKey, filters = [], bulkActions = [], emptyState }: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredData = useMemo(() => {
    return data.filter(row => {
      const matchesFilters = filters.every(filter => {
        const value = selectedFilters[filter.key as string];
        if (!value || value === 'all') return true;
        return String(row[filter.key]) === value;
      });

      const matchesSearch = searchTerm
        ? Object.values(row).some(val =>
            String(val || '')
              .toLowerCase()
              .includes(searchTerm.toLowerCase())
          )
        : true;

      return matchesFilters && matchesSearch;
    });
  }, [data, filters, searchTerm, selectedFilters]);

  const toggleRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredData.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredData.map(row => rowKey(row))));
    }
  };

  const selectedRows = filteredData.filter(row => selectedIds.has(rowKey(row)));

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
      <div className="px-4 py-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-2 top-2.5" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          {filters.map(filter => (
            <label key={String(filter.key)} className="flex items-center gap-2 text-sm text-slate-700">
              <Filter className="w-4 h-4 text-slate-400" />
              <span>{filter.label}</span>
              <select
                value={selectedFilters[filter.key as string] || 'all'}
                onChange={e =>
                  setSelectedFilters(prev => ({
                    ...prev,
                    [filter.key as string]: e.target.value,
                  }))
                }
                className="border border-slate-200 rounded-lg px-2 py-1 text-sm"
              >
                <option value="all">Todos</option>
                {filter.options.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        {bulkActions.length > 0 && selectedRows.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span className="font-semibold text-indigo-600">{selectedRows.length} seleccionados</span>
            {bulkActions.map(action => (
              <button
                key={action.label}
                onClick={() => action.onAction(selectedRows)}
                className="px-3 py-1 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {filteredData.length === 0 ? (
        <div className="p-6 text-center text-slate-500">{emptyState || 'Sin resultados'}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <button onClick={toggleAll} className="flex items-center gap-2 text-slate-700">
                    {selectedIds.size === filteredData.length && filteredData.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-indigo-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                    Seleccionar todo
                  </button>
                </th>
                {columns.map(column => (
                  <th
                    key={String(column.key)}
                    className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {filteredData.map(row => (
                <tr key={rowKey(row)} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <button onClick={() => toggleRow(rowKey(row))} className="flex items-center">
                      {selectedIds.has(rowKey(row)) ? (
                        <CheckSquare className="w-4 h-4 text-indigo-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </td>
                  {columns.map(column => (
                    <td key={String(column.key)} className="px-4 py-3 text-sm text-slate-700">
                      {column.render ? column.render(row) : String((row as Record<string, unknown>)[column.key as string])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
