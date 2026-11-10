import React from 'react';
import { LayoutGrid, Table as TableIcon } from 'lucide-react';
import { Block } from '@/types/document';

interface TableGridBlockItemProps {
  block: Block;
  readOnly?: boolean;
  onUpdateMeta: (id: string, meta: NonNullable<Block['meta']>) => void;
}

export const TableGridBlockItem: React.FC<TableGridBlockItemProps> = ({
  block,
  readOnly = false,
  onUpdateMeta,
}) => {
  const headers = block.meta?.headers ?? ['Coluna 1', 'Coluna 2'];
  const rows = block.meta?.rows ?? [['', '']];

  return (
    <div className="border border-neutral-200 rounded-xl p-4 bg-neutral-50/70 space-y-3 text-xs">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-neutral-700 flex items-center gap-1.5">
          {block.type === 'box' ? (
            <>
              <LayoutGrid className="w-3.5 h-3.5 text-teal-600" />
              Quadro
            </>
          ) : (
            <>
              <TableIcon className="w-3.5 h-3.5 text-purple-600" />
              Tabela
            </>
          )}
        </span>
        {!readOnly && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                const nextHeaders = [...headers, `Coluna ${headers.length + 1}`];
                const nextRows = rows.map((r) => [...r, '']);
                onUpdateMeta(block.id, { headers: nextHeaders, rows: nextRows });
              }}
              className="px-2 py-1 bg-white border border-neutral-200 rounded hover:bg-neutral-100 text-[11px]"
            >
              + Coluna
            </button>
            <button
              type="button"
              onClick={() => {
                const nextRows = [...rows, Array(headers.length).fill('')];
                onUpdateMeta(block.id, { headers, rows: nextRows });
              }}
              className="px-2 py-1 bg-white border border-neutral-200 rounded hover:bg-neutral-100 text-[11px]"
            >
              + Linha
            </button>
          </div>
        )}
      </div>

      <input
        type="text"
        value={block.meta?.caption || ''}
        readOnly={readOnly}
        onChange={(e) => {
          if (!readOnly) onUpdateMeta(block.id, { caption: e.target.value });
        }}
        placeholder="Título da Tabela (acima)"
        className="w-full text-xs px-2.5 py-1.5 bg-white border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
      />

      <div className="overflow-x-auto bg-white rounded-lg border border-neutral-200">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-neutral-100 border-b border-neutral-300">
              {headers.map((h, cIdx) => (
                <th key={cIdx} className="p-1.5 border-r last:border-r-0 border-neutral-200">
                  <input
                    type="text"
                    value={h}
                    readOnly={readOnly}
                    onChange={(e) => {
                      if (readOnly) return;
                      const nextHeaders = [...headers];
                      nextHeaders[cIdx] = e.target.value;
                      onUpdateMeta(block.id, { headers: nextHeaders });
                    }}
                    className="w-full font-bold bg-transparent focus:outline-none"
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rIdx) => (
              <tr key={rIdx} className="border-b last:border-b-0 border-neutral-200">
                {headers.map((_, cIdx) => (
                  <td key={cIdx} className="p-1.5 border-r last:border-r-0 border-neutral-200">
                    <input
                      type="text"
                      value={row[cIdx] ?? ''}
                      readOnly={readOnly}
                      onChange={(e) => {
                        if (readOnly) return;
                        const nextRows = rows.map((r) => [...r]);
                        nextRows[rIdx][cIdx] = e.target.value;
                        onUpdateMeta(block.id, { rows: nextRows });
                      }}
                      placeholder="..."
                      className="w-full bg-transparent focus:outline-none"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <input
        type="text"
        value={block.meta?.source || ''}
        readOnly={readOnly}
        onChange={(e) => {
          if (!readOnly) onUpdateMeta(block.id, { source: e.target.value });
        }}
        placeholder="Fonte da Tabela (abaixo)"
        className="w-full text-xs px-2.5 py-1.5 bg-white border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
      />
    </div>
  );
};
