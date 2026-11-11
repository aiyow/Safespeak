import { useState } from 'react'
import { ArrowRight, BookOpen, ChevronRight, Clock3, Database, Inbox, LayoutGrid, ShieldCheck, UsersRound } from 'lucide-react'
import { WorkspaceMetrics, WorkspaceSidebar, WorkspaceTable, WorkspaceTopbar } from '../../components/WorkspaceChrome.jsx'
import { useAuth } from '../../context/authContext.js'
import { FAQManagement } from './FAQManagement.jsx'
import { AuditLogs, AuditRows, AuditDetail } from './AuditLogs.jsx'
import { useApiList } from '../../hooks/useApiList.js'
import { Feedback } from '../../components/ModuleUI.jsx'
const modules = [
  { key: 'users', label: 'Users & access', description: 'Accounts, roles, and access scope', icon: UsersRound },
  { key: 'faq', label: 'FAQ Management', description: 'Help desk answers for students', icon: BookOpen },
  { key: 'system', label: 'System & data', description: 'Configuration and data management', icon: Database },
  { key: 'activity', label: 'Audit Logs', description: 'Administrative actions and system events', icon: Clock3 },
]
const sections = [{ key: 'overview', label: 'Overview', icon: LayoutGrid }, ...modules]

const metrics = [
  { label: 'Accounts', value: '', detail: 'Active accounts', icon: UsersRound },
  { label: 'CCS personnel', value: '', detail: 'Personnel accounts', icon: ShieldCheck },
  { label: 'Concern records', value: '', detail: 'Aggregate count', icon: Inbox },
  { label: 'Published FAQs', value: '', detail: 'Visible in the student help desk', icon: BookOpen },
]

function AdminOverview({ onSelect }) {
  const faqs = useApiList('/admin/faqs', { publication: 'published', pageSize: 1 })
  const logs = useApiList('/admin/audit-logs', { pageSize: 5 })
  const [selectedLog, setSelectedLog] = useState(null)
  const liveMetrics = metrics.map(item => item.label === 'Published FAQs' ? { ...item, value: !faqs.loading && !faqs.error && faqs.pagination.total > 0 ? faqs.pagination.total : '' } : item)
  return (
    <>
      <div className="mb-7 flex items-center justify-between gap-[18px] [&_h1]:font-[Baskervville,Georgia,serif] [&_h1]:text-[clamp(2rem,3.1vw,2.7rem)] [&_h1]:leading-[1.13] [&_h1]:font-normal [&_h1]:tracking-[-.033em] max-[720px]:flex-col max-[720px]:items-start">
        <div>
          <p className="mb-3 text-[.67rem] font-[660] tracking-[.15em] text-[#80515c] uppercase">System administration</p>
          <h1>A well-managed space.</h1>
          <p className="mt-3 text-[.85rem] leading-[1.6] text-[#68595d]">Support the people and settings behind SafeSpeak.</p>
        </div>
        <button type="button" className="inline-flex min-h-[42px] shrink-0 items-center gap-2.5 rounded-lg border-0 bg-[#b71f38] px-4 py-[9px] text-[.79rem] font-[650] text-white shadow-[0_3px_8px_#af1e351c] hover:bg-[#99182e]" onClick={() => onSelect('users')}>
          Manage users <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
      <Feedback loading={faqs.loading || logs.loading} error={faqs.error || logs.error} reload={() => { faqs.reload(); logs.reload() }} /><WorkspaceMetrics metrics={liveMetrics} />
      <div className="mb-7 grid grid-cols-[minmax(0,2.2fr)_minmax(230px,1fr)] items-start gap-6 max-[830px]:grid-cols-1">
        <section className="min-w-0 rounded-xl border border-[#e7dcde] bg-[#fffdfd] shadow-[0_4px_18px_#30222606] p-[clamp(20px,3vw,30px)] [&_h2]:font-[Baskervville,Georgia,serif] [&_h2]:text-[clamp(1.7rem,3vw,2.3rem)] [&_h2]:leading-[1.13] [&_h2]:font-normal [&_h2]:tracking-[-.033em]" aria-labelledby="management-title">
        <p className="mb-3 text-[.67rem] font-[660] tracking-[.15em] text-[#80515c] uppercase">System management</p>
        <h2 id="management-title">Care starts behind<br /> the scenes, too.</h2>
        <div className="mt-6 [&_button]:grid [&_button]:w-full [&_button]:grid-cols-[20px_minmax(0,1fr)_17px] [&_button]:items-center [&_button]:gap-3 [&_button]:border-0 [&_button]:border-t [&_button]:border-[#e7dcde] [&_button]:bg-transparent [&_button]:px-0.5 [&_button]:py-3.5 [&_button]:text-left [&_button:hover]:bg-[#f8edef] [&_svg]:text-[#9e6170] [&_strong]:block [&_strong]:text-[.82rem] [&_small]:mt-1 [&_small]:block [&_small]:text-[.72rem] [&_small]:text-[#68595d]">
          {modules.map(({ key, label, description, icon: Icon }) => (
            <button type="button" key={key} onClick={() => onSelect(key)}>
              <Icon size={19} aria-hidden="true" />
              <span><strong>{label}</strong><small>{description}</small></span>
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          ))}
        </div>
        </section>
        <section className="min-h-40 rounded-xl border border-[#e7dcde] bg-[#fffdfd] px-6 py-[22px] shadow-[0_4px_18px_#30222606]" aria-labelledby="admin-access-title">
          <h2 id="admin-access-title" className="mb-3 text-[.99rem] font-semibold">Administrator access</h2>
          <p className="text-[.82rem] leading-[1.65] text-[#68595d]">Administration covers accounts and system configuration.</p>
        </section>
      </div>
      <WorkspaceTable
        id="admin-activity-title"
        title="Recent activity"
        columns={['Event', 'Actor', 'Record / Setting', 'When']}
        action={<button type="button" onClick={() => onSelect('activity')} className="inline-flex items-center gap-[7px] border-0 bg-transparent py-1.5 text-[.77rem] font-[660] whitespace-nowrap text-[#971b31] hover:underline">View audit logs <ArrowRight size={14} aria-hidden="true" /></button>}
      ><AuditRows rows={logs.loading ? [] : logs.data} onOpen={setSelectedLog} /></WorkspaceTable>
      {selectedLog && <AuditDetail log={selectedLog} onClose={() => setSelectedLog(null)} />}
    </>
  )
}

export function AdminDashboard() {
  const { user } = useAuth()
  const [selected, setSelected] = useState('overview')
  const section = sections.find(item => item.key === selected)

  return (
    <div className="grid min-h-svh grid-cols-[238px_minmax(0,1fr)] bg-[#f7f4f4] text-[#271d20] [&_:focus-visible]:outline-[#b71f38] max-[720px]:grid-cols-1" data-role="admin">
      <WorkspaceSidebar label="Administration" sections={sections} selected={selected} onSelect={setSelected} />
      <div className="min-w-0">
        <WorkspaceTopbar label="Administration" section={section.label} role="Administrator" name={user.fullName} />
        <main className="mx-auto w-full max-w-[1400px] px-[clamp(18px,4vw,44px)] pt-9 pb-11">
          {selected === 'overview' && <AdminOverview onSelect={setSelected} />}
          <div hidden={selected !== 'faq'}><FAQManagement /></div>
          {selected === 'activity' && <AuditLogs />}
        </main>
      </div>
    </div>
  )
}
