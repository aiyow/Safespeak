import { useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { api } from '../../services/api.js'
import { Feedback, Modal, inputClass, buttonClass, primaryClass } from '../../components/ModuleUI.jsx'

export function FAQManagement() {
  const [faqs, setFaqs] = useState([])
  const [revision, setRevision] = useState('')
  const [loading, setLoading] = useState(true)
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editor, setEditor] = useState(null)
  const [editorError, setEditorError] = useState('')
  const [deleting, setDeleting] = useState(null)
  const pending = dirty || faqs.some(faq => !faq.isPublished)

  function accept(result) {
    setFaqs(result.data.map(faq => ({ ...faq, key: faq.id })))
    setRevision(result.revision)
    setDirty(false)
  }
  useEffect(() => {
    const controller = new AbortController()
    api('/admin/faqs/workspace', { signal: controller.signal }).then(result => {
      if (!controller.signal.aborted) { accept(result); setLoading(false) }
    }).catch(failure => { if (!controller.signal.aborted) { setError(failure.message); setLoading(false) } })
    return () => controller.abort()
  }, [])
  useEffect(() => {
    if (!dirty) return
    const warn = event => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  async function reload() {
    if (dirty && !window.confirm('Discard unsaved FAQ changes and reload the saved answers?')) return
    setLoading(true); setError(''); setNotice('')
    try { accept(await api('/admin/faqs/workspace')) }
    catch (failure) { setError(failure.message) }
    finally { setLoading(false) }
  }
  async function save() {
    setBusy(true); setError(''); setNotice('')
    try {
      accept(await api('/admin/faqs', { method: 'PUT', data: { revision, faqs: faqs.map(({ id, question, answer }) => ({ ...(id ? { id } : {}), question, answer })) } }))
      setNotice('All FAQ changes have been saved and published to the student and personnel Help Desk.')
    } catch (failure) { setError(failure.message) }
    finally { setBusy(false) }
  }
  function stageEdit(event) {
    event.preventDefault()
    const fields = Object.fromEntries(new FormData(event.currentTarget))
    const question = fields.question.trim(), answer = fields.answer.trim()
    if (!question || !answer) { setEditorError('Enter a question and an answer.'); return }
    const updated = { ...editor, question, answer }
    setFaqs(previous => editor.key ? previous.map(faq => faq.key === editor.key ? updated : faq) : [...previous, { ...updated, key: crypto.randomUUID(), isPublished: false }])
    setDirty(true); setNotice(''); setEditor(null)
  }
  function edit(faq) { setEditorError(''); setEditor(faq) }

  return (
    <section>
      <p className="mb-3 text-[.67rem] font-semibold tracking-[.15em] text-[#80515c] uppercase">Helpful information</p>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="font-[Baskervville,Georgia,serif] text-[clamp(2rem,3vw,2.7rem)] leading-tight">FAQ content</h1>
          <button type="button" className={primaryClass} disabled={loading || busy || !revision || !pending} onClick={save}>{busy ? 'Saving...' : 'SAVE FAQ'}</button>
        </div>
        <button type="button" className={`${primaryClass} inline-flex items-center gap-2`} disabled={loading || busy || !revision} onClick={() => edit({ question: '', answer: '' })}><Plus size={16} aria-hidden="true" /> Add an FAQ</button>
      </div>
      <p className="text-sm leading-6 text-[#68595d]">Maintain the answers students and personnel see in Help Desk &amp; FAQ.</p>
      <div className="mt-3 mb-6 flex flex-wrap items-center justify-between gap-3 text-xs text-[#68595d]">
        <p>{pending ? 'Unsaved changes. Additions, edits, and deletions go live only when you click SAVE FAQ.' : 'All changes are saved. Edit answers here, then click SAVE FAQ to update the Help Desk.'}</p>
        <button type="button" className="text-[#831f37] underline underline-offset-4" disabled={busy || loading} onClick={reload}>Reload saved FAQs</button>
      </div>
      <Feedback loading={loading} error={error} reload={reload} />
      {notice && <p role="status" className="mb-5 rounded-lg border border-[#bfe2d8] bg-[#ecfaf5] p-3 text-sm text-[#155e4a]">{notice}</p>}
      <section aria-labelledby="faq-answers-title" className="overflow-hidden rounded-xl border border-[#e7dcde] bg-white shadow-[0_4px_18px_#30222606]">
        <div className="flex items-center justify-between gap-4 border-b border-[#e7dcde] px-6 py-5">
          <h2 id="faq-answers-title" className="text-base font-semibold">FAQ answers</h2>
          <span className="text-xs text-[#68595d]">{!loading && `${faqs.length} FAQs`}</span>
        </div>
        <div className="min-h-24">
          {!loading && faqs.map(faq => (
            <article key={faq.key} className="flex items-start justify-between gap-4 border-b border-[#e7dcde] px-6 py-6 last:border-b-0 max-[480px]:flex-col">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold leading-6 [overflow-wrap:anywhere]">{faq.question}</h3>
                <p className="mt-2 text-[.8rem] leading-6 whitespace-pre-wrap text-[#68595d] [overflow-wrap:anywhere]">{faq.answer}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button type="button" className="rounded-md border border-[#dfcdd2] px-3 py-1.5 text-xs text-[#831f37] hover:bg-[#f8edef]" disabled={busy} onClick={() => edit(faq)}>Edit</button>
                <button type="button" aria-label={`Delete FAQ: ${faq.question}`} title="Delete FAQ" className="grid size-8 place-items-center rounded-md text-[#80616c] hover:bg-[#f8edef] hover:text-[#831f37]" disabled={busy} onClick={() => setDeleting(faq)}><X size={17} aria-hidden="true" /></button>
              </div>
            </article>
          ))}
        </div>
      </section>
      {editor && <Modal title={editor.key ? 'Edit FAQ' : 'Add an FAQ'} onClose={() => setEditor(null)}>
        <form className="grid gap-4" onSubmit={stageEdit}>
          <label className="grid gap-2 text-sm font-semibold">Question<input autoFocus name="question" required maxLength={300} defaultValue={editor.question} className={inputClass} /></label>
          <label className="grid gap-2 text-sm font-semibold">Answer<textarea name="answer" required maxLength={10000} rows={9} defaultValue={editor.answer} className={inputClass} /></label>
          <p className="text-xs leading-6 text-[#68595d]">This updates your editing list only. Click SAVE FAQ on the main page to save and publish all changes.</p>
          <Feedback error={editorError} />
          <div className="flex justify-end gap-3"><button type="button" className={buttonClass} onClick={() => setEditor(null)}>Cancel</button><button className={primaryClass}>Apply to list</button></div>
        </form>
      </Modal>}
      {deleting && <Modal title="Remove FAQ from the list?" onClose={() => setDeleting(null)}>
        <p className="mb-3 font-semibold [overflow-wrap:anywhere]">{deleting.question}</p>
        <p className="text-sm leading-6 text-[#68595d]">It will remain visible to students and personnel until you click SAVE FAQ. Saving will permanently delete it and preserve its audit history.</p>
        <div className="mt-5 flex justify-end gap-3"><button type="button" className={buttonClass} onClick={() => setDeleting(null)}>Cancel</button><button type="button" className={primaryClass} onClick={() => { setFaqs(previous => previous.filter(faq => faq.key !== deleting.key)); setDirty(true); setNotice(''); setDeleting(null) }}>Remove from list</button></div>
      </Modal>}
    </section>
  )
}
