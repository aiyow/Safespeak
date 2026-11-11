import { useEffect, useId, useRef } from 'react'
export const inputClass = 'min-h-10 min-w-0 rounded-lg border border-[#dfcdd2] bg-white px-3 py-2 text-sm'
export const buttonClass = 'inline-flex min-h-10 items-center justify-center rounded-lg border border-[#dfcdd2] bg-white px-3 py-2 text-sm text-[#831f37] hover:bg-[#f8edef] disabled:opacity-50'
export const primaryClass = 'min-h-10 rounded-lg bg-[#831f37] px-4 py-2 text-sm font-semibold text-white hover:bg-[#68152a] disabled:opacity-50'
export const dateText = value => new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
export const actionText = action => ({ 'faq.created': 'FAQ created', 'faq.updated': 'FAQ edited', 'faq.published': 'FAQ published', 'faq.unpublished': 'FAQ unpublished', 'faq.deleted': 'FAQ deleted' }[action] || action)
export function ModuleTitle({ children }) { return <h1 className="mb-6 font-[Baskervville,Georgia,serif] text-3xl">{children}</h1> }
export function Feedback({ loading, error, reload }) {
  return <>{loading && <p role="status" className="my-4 text-sm text-[#68595d]">Loading…</p>}{error && <div role="alert" className="my-4 rounded-lg border border-[#ebc2c2] bg-[#fff1f0] p-3 text-sm text-[#872b2b]">{error} {reload && <button type="button" className="underline" onClick={reload}>Try again</button>}</div>}</>
}
export function Pagination({ pagination, page, onPage, loading }) {
  const pages = Math.max(1, Math.ceil(pagination.total / pagination.pageSize))
  return <nav aria-label="Pagination" className="mt-4 flex flex-wrap items-center justify-end gap-3 text-sm"><button type="button" className={buttonClass} disabled={loading || page <= 1} onClick={() => onPage(page - 1)}>Previous</button><span>Page {page} of {Math.max(page, pages)}</span><button type="button" className={buttonClass} disabled={loading || page >= pages} onClick={() => onPage(page + 1)}>Next</button></nav>
}
export function Modal({ title, onClose, busy = false, children }) {
  const dialog = useRef(null)
  const titleId = useId()
  useEffect(() => { dialog.current.showModal() }, [])
  return <dialog ref={dialog} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); if (!busy) onClose() }} className="fixed inset-0 m-auto max-h-[90svh] w-[min(640px,calc(100vw-32px))] overflow-auto rounded-xl border border-[#e7dcde] bg-white p-6 text-[#271d20] shadow-xl backdrop:bg-black/40"><div className="mb-5 flex items-center justify-between gap-4"><h2 id={titleId} className="text-xl font-semibold">{title}</h2><button type="button" aria-label="Close dialog" disabled={busy} onClick={onClose} className={buttonClass}>Close</button></div>{children}</dialog>
}
