import React from 'react';

interface PaginationProps {
  page: number;
  totalPages: number;
  setPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ page, totalPages, setPage, pageSize, setPageSize }) => {
  return (
    <div className="flex items-center justify-between mt-4 p-4 bg-threat-surface border border-threat-border rounded-lg">
      <div className="flex items-center space-x-2">
        <span className="text-sm text-threat-muted">Rows per page:</span>
        <select
          className="bg-threat-bg border border-threat-border rounded px-2 py-1 text-threat-text text-sm focus:outline-none"
          value={pageSize}
          onChange={(e) => setPageSize(parseInt(e.target.value))}
        >
          {[10, 25, 50, 100].map(size => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
      </div>
      
      <div className="flex items-center space-x-4">
        <span className="text-sm text-threat-muted">
          Page {page} of {Math.max(1, totalPages)}
        </span>
        <div className="flex space-x-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="px-3 py-1 bg-threat-bg border border-threat-border rounded hover:bg-threat-border disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Prev
          </button>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages || totalPages === 0}
            className="px-3 py-1 bg-threat-bg border border-threat-border rounded hover:bg-threat-border disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};
