import { FilterBar } from '../../components/FilterBar.jsx'
import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { useAuth } from '../../context/authContext.js'
import { api } from '../../services/api.js'
import { useApiList } from '../../hooks/useApiList.js'
import { WorkspaceAvatar, WorkspaceTable } from '../../components/WorkspaceChrome.jsx'
import { RegistrationNameFields } from '../../components/RegistrationFields.jsx'
import { PasswordField } from '../../components/PasswordField.jsx'
import { ModuleTitle, Feedback, Pagination, Modal, inputClass, buttonClass, primaryClass } from '../../components/ModuleUI.jsx'
const roleNames = { student: 'Student', personnel: 'CCS Personnel', admin: 'Administrator' }
const profileFields = ['course', 'studentNumber', 'yearLevel', 'section']

function scopeDescription(account) {
  if(account.role==='student')return 'Own concerns';
  if(account.role==='admin')return 'Administration & oversight';
  const categories=account.categories.filter(category=>category.isActive).map(category=>category.name).join(', ');
  return `${account.isIntakeCoordinator?'All submitted concerns':'Assigned cases only'} · Eligible categories: ${categories||'None'}`;
}

function UserEditor({ record, onClose, onSaved }) {
  const { user } = useAuth()
  const [role, setRole] = useState(record?.role || 'student')
  const [coordinator, setCoordinator] = useState(record?.isIntakeCoordinator || false)
  const [active, setActive] = useState(record?.isActive ?? true)
  const [scope, setScope] = useState(record?.categoryIds || [])
  const [categories, setCategories] = useState([])
  const [categoryError, setCategoryError] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(null)
  const self = record?.id === user.id
  const requiresProfile = !record || record.role !== 'student'
  useEffect(() => {
    const controller = new AbortController()
    api('/categories', { signal: controller.signal }).then(result => {
      if (!controller.signal.aborted) setCategories(result.data)
    }).catch(failure => { if (!controller.signal.aborted) setCategoryError(failure.message) })
    return () => controller.abort()
  }, [])
  const choices = [...categories, ...(record?.categories || []).filter(category => !categories.some(item => item.id === category.id))]
  async function commit(data) {
    setBusy(true); setError('')
    try { const result = await api(record ? `/admin/users/${record.id}` : '/admin/users', { method: record ? 'PATCH' : 'POST', data }); onSaved(result.data) }
    catch (failure) { setError(failure.message); setPending(null) }
    finally { setBusy(false) }
  }
  function submit(event) {
    event.preventDefault(); setError('')
    const values = Object.fromEntries(new FormData(event.currentTarget))
    const data = { email: values.email, role, isIntakeCoordinator: role === 'personnel' && coordinator, isActive: active, categoryIds: role === 'personnel' ? scope : [] }
    if (record) { data.fullName = values.fullName; data.updatedAt = record.updatedAt }
    else { for (const field of ['firstName','middleInitial','lastName','password']) data[field] = values[field] }
    if (role === 'student') {
      for (const field of profileFields) {
        const value = values[field] || null
        const parsed = field === 'yearLevel' && value ? Number(value) : value
        if (!record || record.role !== 'student' || parsed !== (record[field] ?? null)) data[field] = parsed
      }
    }
    const accessChanged = !record ? role === 'admin' || coordinator || scope.length > 0 : data.isIntakeCoordinator !== record.isIntakeCoordinator || role !== record.role || active !== record.isActive || JSON.stringify([...data.categoryIds].sort()) !== JSON.stringify([...record.categoryIds].sort())
    if (accessChanged) setPending(data)
    else commit(data)
  }
  return <Modal title={record ? 'Edit account' : 'Add user'} onClose={onClose} busy={busy}>
    <Feedback error={error} />
    <form onSubmit={submit} hidden={!!pending}>
      <fieldset disabled={busy} className="grid min-w-0 gap-4">
        {record ? <label className="grid gap-2 text-sm font-semibold">Full name<input name="fullName" defaultValue={record.fullName} maxLength={150} required className={inputClass} /></label> : <RegistrationNameFields />}
        <label className="grid gap-2 text-sm font-semibold">Email<input name="email" type="email" defaultValue={record?.email} maxLength={255} required autoComplete="off" className={inputClass} /></label>
        <label className="grid gap-2 text-sm font-semibold">Role<select value={role} onChange={event => setRole(event.target.value)} disabled={self} className={inputClass}>{Object.entries(roleNames).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={active} disabled={self} onChange={event => setActive(event.target.checked)} /> Active account</label>
        {role === 'personnel' && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={coordinator} onChange={event => setCoordinator(event.target.checked)} className="accent-[#bd2039]" /> Intake Coordinator</label>}
        {self && <p className="text-xs text-[#68595d]">Your own role and active status cannot be changed here.</p>}
        {!record && <PasswordField isNew />}
        {role === 'student' && <fieldset className="grid min-w-0 grid-cols-2 gap-3 max-[420px]:grid-cols-1"><legend className="mb-3 text-sm font-semibold">Student details</legend>
          <label className="grid gap-2 text-sm">Course<select name="course" defaultValue={record?.course || ''} required={requiresProfile} className={inputClass}><option value="">Select course</option><option>BSIT</option><option>BSCS</option></select></label>
          <label className="grid gap-2 text-sm">Student number<input name="studentNumber" defaultValue={record?.studentNumber || ''} required={requiresProfile} maxLength={10} pattern="[0-9]{3}-[0-9]{5}[A-Za-z]" title="Use the format 234-12345M" className={inputClass} /></label>
          <label className="grid gap-2 text-sm">Year level<select name="yearLevel" defaultValue={record?.yearLevel || ''} required={requiresProfile} className={inputClass}><option value="">Select year</option>{[1,2,3,4].map(year => <option key={year} value={year}>{year}</option>)}</select></label>
          <label className="grid gap-2 text-sm">Section<input name="section" defaultValue={record?.section || ''} required={requiresProfile} maxLength={30} className={inputClass} /></label>
        </fieldset>}
        {role === 'personnel' && (
          <fieldset className="m-0 min-w-0 border-0 p-0">
            <legend className="mb-2.5 p-0 text-xs font-normal text-[#352129]">Personnel assignment eligibility</legend>
            <Feedback error={categoryError} />
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              {choices.map(category => (
                <label key={category.id} className="flex cursor-pointer items-start gap-2.5 text-[.7rem] leading-5 text-[#68595d] has-disabled:cursor-default">
                  <input type="checkbox" className="mt-0.5 size-3.5 shrink-0 accent-[#bd2039] focus-visible:outline-[#831f37]" checked={scope.includes(category.id)} disabled={category.isActive === false} onChange={event => setScope(previous => event.target.checked ? [...previous,category.id] : previous.filter(id => id !== category.id))} />
                  <span>{category.name}{category.isActive === false ? ' (inactive)' : ''}</span>
                </label>
              ))}
            </div>
            <p className="mt-2.5 text-[.71rem] leading-5 text-[#80616c]">Selected categories determine assignment eligibility, not access to unassigned concerns. Existing assignments are retained.</p>
          </fieldset>
        )}
        <div className="mt-3 flex items-center justify-between gap-4">
          <button type="button" onClick={onClose} className="min-h-10 rounded-lg px-[18px] py-2 text-xs text-[#68595d] hover:bg-[#f8edef]">Cancel</button>
          <button className="min-h-[42px] rounded-lg bg-[#bd2039] px-[18px] py-2.5 text-xs font-semibold text-white shadow-[0_3px_8px_#af1e351c] hover:bg-[#a51c32] disabled:opacity-50">{busy ? 'Saving...' : record ? 'Save account changes' : 'Create user'}</button>
        </div>
      </fieldset>
    </form>
    {pending && <div><h3 className="mb-3 font-semibold">Confirm account access</h3><dl className="grid gap-2 text-sm"><dt className="font-semibold">Role</dt><dd>{roleNames[role]}</dd><dt className="font-semibold">Intake Coordinator</dt><dd>{role === 'personnel' && coordinator ? 'Yes — can review all submitted concerns' : 'No'}</dd><dt className="font-semibold">Status</dt><dd>{active ? 'Active' : 'Inactive'}</dd>{role === 'personnel' && <><dt className="font-semibold">Category eligibility</dt><dd>{choices.filter(category => scope.includes(category.id)).map(category => category.name).join(', ') || 'No category access'}</dd></>}</dl><p className="mt-4 text-sm leading-6 text-[#68595d]">These changes take effect immediately. Existing sessions are revoked when account access changes.</p><div className="mt-5 flex justify-end gap-3"><button type="button" className={buttonClass} disabled={busy} onClick={() => setPending(null)}>Back</button><button type="button" className={primaryClass} disabled={busy} onClick={() => commit(pending)}>{busy ? 'Saving...' : 'Confirm and save'}</button></div></div>}
  </Modal>
}

export function UsersAccess() {
  const [filters, setFilters] = useState({ page: 1 })
  const list = useApiList('/admin/users', filters)
  const [editor, setEditor] = useState(null)
  const [creating, setCreating] = useState(false)
  const [opening, setOpening] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const { user, refreshUser } = useAuth()
  async function openUser(id) {
    setOpening(true); setError('')
    try { setEditor((await api(`/admin/users/${id}`)).data) }
    catch (failure) { setError(failure.message) }
    finally { setOpening(false) }
  }
  function saved(account) {
    if (account.id === user.id) refreshUser(account)
    setEditor(null); setCreating(false); setNotice('Account saved.'); list.reload()
  }
  return <section>
    <div className="flex flex-wrap items-start justify-between gap-4"><ModuleTitle>Users &amp; access</ModuleTitle><button type="button" className={`${primaryClass} inline-flex items-center gap-2`} onClick={() => { setError(''); setCreating(true) }}><Plus size={16} aria-hidden="true" /> Add user</button></div>
    <p className="mb-5 text-sm text-[#68595d]">Manage accounts, roles, and personnel category access.</p>
    <FilterBar className="mb-5" applied={filters} placeholder="Search name, email, or student number" maxLength={300} onSubmit={event => { event.preventDefault(); setFilters({ ...Object.fromEntries(new FormData(event.currentTarget)), page: 1 }) }}><label className="grid gap-2 text-xs">Role<select name="role" aria-label="Filter user role" className={inputClass}><option value="all">All roles</option>{Object.entries(roleNames).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label><label className="grid gap-2 text-xs">Status<select name="status" aria-label="Filter account status" className={inputClass}><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label></FilterBar>
    <Feedback loading={list.loading || opening} error={error || list.error} reload={list.reload} />
    {notice && <p role="status" className="mb-4 text-sm text-[#155e4a]">{notice}</p>}
    <WorkspaceTable id="users-table-title" title="User accounts" columns={['Account', 'Role', 'Status', 'Access / eligibility', 'Action']}>
      {!list.loading && list.data.map(account => <tr key={account.id} className="border-t border-[#e7dcde] text-sm"><td className="p-4"><div className="flex items-center gap-3"><WorkspaceAvatar name={account.fullName} /><div className="max-w-xs [overflow-wrap:anywhere]"><strong>{account.fullName}</strong><p className="mt-1 text-xs text-[#68595d]">{account.email}</p></div></div></td><td className="p-4">{roleNames[account.role]}{account.isIntakeCoordinator && <span className="mt-1 block text-xs text-[#831f37]">Intake Coordinator</span>}</td><td className="p-4">{account.isActive ? 'Active' : 'Inactive'}</td><td className="max-w-xs p-4 text-xs leading-6 text-[#68595d]">{scopeDescription(account)}</td><td className="p-4"><button type="button" className={buttonClass} disabled={opening} onClick={() => openUser(account.id)}>Edit<span className="sr-only"> {account.fullName}</span></button></td></tr>)}
    </WorkspaceTable><Pagination {...list} page={filters.page} onPage={page => setFilters(previous => ({ ...previous, page }))} />
    {(creating || editor) && <UserEditor record={editor} onClose={() => { setCreating(false); setEditor(null) }} onSaved={saved} />}
  </section>
}
