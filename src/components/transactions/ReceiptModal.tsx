import { useEffect, useState } from 'react'
import { X, ExternalLink, Loader2 } from 'lucide-react'
import { getReceiptUrl } from '../../lib/api'

interface Props {
  receiptPath: string
  onClose: () => void
}

export default function ReceiptModal({ receiptPath, onClose }: Props) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const isPdf = receiptPath.toLowerCase().endsWith('.pdf')

  useEffect(() => {
    getReceiptUrl(receiptPath)
      .then(setUrl)
      .catch(() => setError(true))
  }, [receiptPath])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <p className="font-medium text-gray-800 text-sm truncate">
            {receiptPath.split('/').pop()}
          </p>
          <div className="flex items-center gap-2 flex-shrink-0">
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open in new tab
              </a>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto flex items-center justify-center bg-gray-50 min-h-[300px]">
          {error ? (
            <p className="text-red-500 text-sm">Could not load receipt.</p>
          ) : !url ? (
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          ) : isPdf ? (
            <iframe
              src={url}
              title="Receipt PDF"
              className="w-full h-[70vh] border-0"
            />
          ) : (
            <img
              src={url}
              alt="Receipt"
              className="max-w-full max-h-[70vh] object-contain rounded"
            />
          )}
        </div>
      </div>
    </div>
  )
}
