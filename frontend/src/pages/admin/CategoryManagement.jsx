import { FilterBar } from '../../components/FilterBar.jsx'
import { useState } from 'react'
import { Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import { api } from '../../services/api.js'
import { useApiList } from '../../hooks/useApiList.js'
import { Feedback, Modal, inputClass, buttonClass, primaryClass } from '../../components/ModuleUI.jsx'

const rowAction = 'inline-flex h-8 items-center justify-center gap-1.5 rounded-md border px-2.5 text-xs font-medium disabled:opacity-50'

export function CategoryManagement() {
  const [filters, setFilters] = useState({ search: '', status: 'all' })
  const list = useApiList('/admin/categories', filters)
  const [editor, setEditor] = useState(null)
  const [pending, setPending] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  function open(record) { setError(''); setPending(null); setEditor(record) }
  async function save(data) {
    setBusy(true); setError(''); setNotice('')
    try {
      await api(editor.id ? `/admin/categories/${editor.id}` : '/admin/categories', { method: editor.id ? 'PATCH' : 'POST', data })
      setEditor(null); setPending(null); setNotice('Category saved.'); list.reload()
    } catch (failure) { setError(failure.message); setPending(null) }
    finally { setBusy(false) }
  }
  async function remove() {
    setBusy(true); setError(''); setNotice('')
    try {
      await api(`/admin/categories/${deleting.id}`, { method: 'DELETE', data: { updatedAt: deleting.updatedAt } })
      setDeleting(null); setNotice('Category deleted. Its audit history has been preserved.'); list.reload()
    } catch (failure) { setError(failure.message) }
    finally { setBusy(false) }
  }
  function submit(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const data = { name: form.get('name').trim(), description: form.get('description').trim(), isActive: form.get('active') === 'on', ...(editor.id ? { updatedAt: editor.updatedAt } : {}) }
    if (!data.name) { setError('Enter a category name.'); return }
    if (editor.isActive && !data.isActive) setPending(data)
    else save(data)
  }

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-2 text-[.65rem] font-semibold tracking-[.15em] text-[#80515c] uppercase">System administration</p>
          <h1 className="font-[Baskervville,Georgia,serif] text-[clamp(1.8rem,3vw,2.35rem)] leading-tight">Category Management</h1>
          <p className="mt-2 text-[.8rem] leading-6 text-[#68595d]">Manage the categories students use when submitting concerns.</p>
        </div>
        <button type="button" className="inline-flex h-10 shrink-0 items-center gap-2 self-center rounded-lg bg-[#831f37] px-4 text-xs font-semibold text-white shadow-sm hover:bg-[#68152a]" onClick={() => open({ name: '', description: '', isActive: true })}>
          <Plus size={16} aria-hidden="true" /> Add category
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#e7dcde] bg-white shadow-[0_3px_14px_#30222605]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e7dcde] px-5 py-4">
          <h2 id="category-table-title" className="text-sm font-semibold">Concern categories <span className="ml-2 rounded-full bg-[#f8edef] px-2 py-0.5 text-[.65rem] font-medium text-[#831f37]">{list.loading ? '' : list.data.length}</span></h2>
          <FilterBar embedded className="w-full" applied={filters} searchLabel="Search categories" placeholder="Search categories" onSubmit={event => { event.preventDefault(); setFilters(Object.fromEntries(new FormData(event.currentTarget))) }}><label className="grid gap-2 text-xs">Status<select name="status" aria-label="Category status" className={inputClass}><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label></FilterBar>
        </div>
        <div className="relative overflow-x-auto [scrollbar-width:thin] [scrollbar-color:#b48690_#f2e8ea]" role="region" aria-labelledby="category-table-title" tabIndex={0}>
          <table className="w-full min-w-[760px] table-fixed border-collapse text-left">
            <colgroup><col className="w-[24%]" /><col /><col className="w-[100px]" /><col className="w-[80px]" /><col className="w-[175px]" /></colgroup>
            <thead className="border-b border-[#e7dcde] bg-[#faf6f7] text-[.62rem] font-semibold tracking-[.07em] text-[#806b73] uppercase">
              <tr><th className="px-5 py-3" scope="col">Category</th><th className="px-4 py-3" scope="col">Description</th><th className="px-3 py-3" scope="col">Status</th><th className="px-3 py-3 text-center" scope="col">Concerns</th><th className="px-4 py-3 text-right" scope="col">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-[#eee5e7]">
              {!list.loading && list.data.map(category => (
                <tr key={category.id} className="align-middle text-[.8rem] hover:bg-[#fdf9fa]">
                  <td className="px-5 py-4 font-semibold leading-5 [overflow-wrap:anywhere]">{category.name}</td>
                  <td className="px-4 py-4 text-xs leading-5 whitespace-pre-wrap text-[#806b73] [overflow-wrap:anywhere]">{category.description}</td>
                  <td className="px-3 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[.66rem] font-medium ${category.isActive ? 'bg-[#edf7f1] text-[#28704b]' : 'bg-[#f1edef] text-[#806b73]'}`}><span className="size-1.5 rounded-full bg-current" aria-hidden="true" />{category.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td className="px-3 py-4 text-center text-xs tabular-nums text-[#68595d]">{category.concernCount}</td>
                  <td className="px-4 py-4"><div className="flex justify-end gap-2">
                    <button type="button" className={`${rowAction} border-[#dfcdd2] text-[#831f37] hover:bg-[#f8edef]`} onClick={() => open(category)}><Pencil size={12} aria-hidden="true" /> Edit<span className="sr-only"> {category.name}</span></button>
                    <button type="button" className={`${rowAction} border-[#efd3d7] text-[#aa2d40] hover:bg-[#fff1f2]`} onClick={() => { setError(''); setDeleting(category) }}><Trash2 size={12} aria-hidden="true" /> Delete<span className="sr-only"> {category.name}</span></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {list.loading && <div className="px-5"><Feedback loading /></div>}
        {list.error && <div className="px-5"><Feedback error={list.error} reload={list.reload} /></div>}
      </div>
      {notice && <p role="status" className="mt-4 text-sm text-[#28704b]">{notice}</p>}

      {editor && <Modal title={editor.id ? 'Edit category' : 'Add category'} busy={busy} onClose={() => setEditor(null)}>
        <Feedback error={error} />
        <form onSubmit={submit} hidden={!!pending}>
          <fieldset disabled={busy} className="grid min-w-0 gap-4">
            <label className="grid gap-2 text-sm font-medium">Category name<input name="name" defaultValue={editor.name} required maxLength={100} className={inputClass} /></label>
            <label className="grid gap-2 text-sm font-medium">Description<textarea name="description" defaultValue={editor.description || ''} maxLength={2000} rows={4} className={inputClass} /></label>
            <label className="flex gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={editor.isActive} className="accent-[#831f37]" /> Active category</label>
            <p className="text-xs leading-6 text-[#68595d]">Inactive categories are hidden from new submissions and eligibility selections. Existing records remain unchanged.</p>
            <div className="flex justify-end gap-3 border-t border-[#eee5e7] pt-4"><button type="button" className={buttonClass} onClick={() => setEditor(null)}>Cancel</button><button className={primaryClass}>{busy ? 'Saving...' : 'Save category'}</button></div>
          </fieldset>
        </form>
        {pending && <div><p className="text-sm leading-6">Deactivate this category? Students must select another active category for new submissions. Existing concerns and assignments will remain.</p><div className="mt-5 flex justify-end gap-3"><button className={buttonClass} disabled={busy} onClick={() => setPending(null)}>Back</button><button className={primaryClass} disabled={busy} onClick={() => save(pending)}>Deactivate category</button></div></div>}
      </Modal>}
      {deleting && <Modal title="Delete category?" busy={busy} onClose={() => setDeleting(null)}>
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-[#efd3d7] bg-[#fff6f7] p-4"><AlertTriangle size={20} className="mt-0.5 shrink-0 text-[#aa2d40]" aria-hidden="true" /><p className="text-sm leading-6">Permanently delete <strong className="[overflow-wrap:anywhere]">{deleting.name}</strong>? This cannot be undone. Its audit history will remain.</p></div>
        <p className="text-xs leading-6 text-[#68595d]">Categories used by concerns or personnel eligibility cannot be deleted. Deactivate those categories instead.</p>
        <Feedback error={error} />
        <div className="mt-5 flex justify-end gap-3 border-t border-[#eee5e7] pt-4"><button type="button" className={buttonClass} disabled={busy} onClick={() => setDeleting(null)}>Cancel</button><button type="button" className="min-h-10 rounded-lg bg-[#b52b40] px-4 py-2 text-sm font-semibold text-white hover:bg-[#982236] disabled:opacity-50" disabled={busy} onClick={remove}>{busy ? 'Deleting...' : 'Delete permanently'}</button></div>
      </Modal>}
    </section>
  )
}
