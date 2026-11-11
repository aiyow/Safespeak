import { HelpDesk } from '../shared/HelpDesk.jsx'
import { useState } from 'react'
import { ArrowRight, Check, CircleHelp, Clock3, Inbox, LayoutGrid, MessageCircle, Send, ShieldCheck, UsersRound } from 'lucide-react'
import { WorkspaceAvatar, WorkspaceMetrics, WorkspaceSidebar, WorkspaceTable, WorkspaceTopbar } from '../../components/WorkspaceChrome.jsx'
import { useAuth } from '../../context/authContext.js'
const sections = [
  { key: 'overview', label: 'Overview', icon: LayoutGrid },
  { key: 'queue', label: 'Concern queue', icon: Inbox },
  { key: 'assignments', label: 'My assignments', icon: UsersRound },
  { key: 'referrals', label: 'Referrals', icon: Send },
  { key: 'help', label: 'Help desk & FAQ', icon: CircleHelp },
]

const metrics = [
  { label: 'Within your scope', value: '', detail: 'Concerns you can review', icon: Inbox },
  { label: 'Awaiting review', value: '', detail: 'Ready for an initial review', icon: Clock3 },
  { label: 'Assigned to you', value: '', detail: 'Active assignments', icon: UsersRound },
  { label: 'Resolved', value: '', detail: 'Recorded outcomes', icon: Check },
]

function PersonnelOverview({ name, onSelect }) {
  return (
    <>
      <div className="mb-7 flex items-center justify-between gap-[18px] [&_h1]:font-[Baskervville,Georgia,serif] [&_h1]:text-[clamp(2rem,3.1vw,2.7rem)] [&_h1]:leading-[1.13] [&_h1]:font-normal [&_h1]:tracking-[-.033em] max-[720px]:flex-col max-[720px]:items-start">
        <div>
          <p className="mb-3 text-[.67rem] font-[660] tracking-[.15em] text-[#80515c] uppercase">CCS personnel workspace</p>
          <h1>Hello, {name}.</h1>
          <p className="mt-3 text-[.85rem] leading-[1.6] text-[#68595d]">A thoughtful response can make all the difference.</p>
        </div>
        <button type="button" className="inline-flex min-h-[42px] shrink-0 items-center gap-2.5 rounded-lg border-0 bg-[#b71f38] px-4 py-[9px] text-[.79rem] font-[650] text-white shadow-[0_3px_8px_#af1e351c] hover:bg-[#99182e]" onClick={() => onSelect('queue')}>
          Open concern queue <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
      <section className="mb-6 flex min-h-[194px] items-center justify-between gap-5 rounded-[13px] border border-[#eacbd2] bg-[linear-gradient(120deg,#faefef,#f2dde2)] px-[clamp(20px,3vw,32px)] py-[26px] [&_h2]:font-[Baskervville,Georgia,serif] [&_h2]:text-[clamp(1.65rem,2.5vw,2.05rem)] [&_h2]:leading-[1.15] [&_h2]:font-normal [&_h2]:tracking-[-.025em] [&_h2]:text-[#4a1c29] [&_p:first-child]:flex [&_p:first-child]:items-center [&_p:first-child]:gap-[7px] [&_p:first-child]:text-[#8c3448] [&_p:last-child]:mt-[13px] [&_p:last-child]:text-[.79rem] [&_p:last-child]:leading-[1.6] [&_p:last-child]:text-[#68595d] max-[480px]:min-h-auto" aria-labelledby="personnel-hero-title">
        <div>
          <p className="mb-3 text-[.67rem] font-[660] tracking-[.15em] text-[#80515c] uppercase"><UsersRound size={15} aria-hidden="true" /> CCS concern management</p>
          <h2 id="personnel-hero-title">A clearer path<br />from concern to resolution.</h2>
          <p>Review student experiences, coordinate next steps, and keep the conversation moving forward.</p>
        </div>
        <span className="mr-[clamp(0px,2.5vw,34px)] grid aspect-square w-[clamp(84px,11vw,134px)] shrink-0 place-items-center rounded-full border border-[#e5bdc6] bg-[#edd0d8] text-[#ab3c55] max-[480px]:hidden" aria-hidden="true"><MessageCircle size={61} strokeWidth={1} /></span>
      </section>
      <WorkspaceMetrics metrics={metrics} />
      <div className="grid grid-cols-[minmax(0,2.75fr)_minmax(220px,1fr)] items-start gap-[22px] max-[1100px]:grid-cols-1">
        <WorkspaceTable
          id="personnel-queue-title"
          title="Your concern queue"
          description="Recent submissions within your scope."
          columns={['Concern / Student', 'Category', 'Status', 'Assigned to']}
          action={<button type="button" onClick={() => onSelect('queue')} className="inline-flex items-center gap-[7px] border-0 bg-transparent py-1.5 text-[.77rem] font-[660] whitespace-nowrap text-[#971b31] hover:underline">View all <ArrowRight size={14} aria-hidden="true" /></button>}
        />
        <section className="min-h-40 min-w-0 rounded-xl border border-[#e7dcde] bg-[#fffdfd] px-[clamp(17px,2vw,24px)] py-[21px] shadow-[0_4px_18px_#30222606]" aria-labelledby="personnel-scope-title">
          <h2 id="personnel-scope-title" className="mb-2.5 text-[1.01rem] font-semibold leading-[1.35]">Your access scope</h2>
        </section>
      </div>
    </>
  )
}

export function PersonnelDashboard() {
  const { user } = useAuth()
  const [selected, setSelected] = useState('overview')
  const section = sections.find(item => item.key === selected)
  const firstName = user.fullName.trim().split(/\s+/)[0]

  function selectSection(key) {
    setSelected(key)
    window.scrollTo(0, 0)
  }

  return (
    <div className="grid min-h-svh grid-cols-[238px_minmax(0,1fr)] bg-[#f7f4f4] text-[#271d20] [&_:focus-visible]:outline-[#b71f38] max-[720px]:grid-cols-1 [&>div]:flex [&>div]:flex-col [&_main]:flex-1" data-role="personnel">
      <WorkspaceSidebar label="Personnel workspace" sections={sections} selected={selected} onSelect={selectSection}>
        <div className="mt-[30px] px-2.5 pt-[5px] [&>svg]:text-[#f48295] max-[720px]:hidden">
          <ShieldCheck size={22} aria-hidden="true" />
          <div className="mt-[18px] flex items-center gap-2.5 border-t border-[#ffffff18] pt-[15px] [&_strong]:block [&_strong]:text-[.74rem] [&_strong]:[overflow-wrap:anywhere] [&_small]:mt-1 [&_small]:block [&_small]:text-[.67rem] [&_small]:text-[#e1c3c9] [&_small]:[overflow-wrap:anywhere]">
            <WorkspaceAvatar name={user.fullName} />
            <span><strong>{user.fullName}</strong><small>CCS Personnel</small></span>
          </div>
        </div>
      </WorkspaceSidebar>
      <div className="min-w-0">
        <WorkspaceTopbar label="Personnel workspace" section={section.label} role="CCS Personnel" name={user.fullName} />
        <main className="mx-auto w-full max-w-[1400px] px-[clamp(18px,4vw,44px)] pt-9 pb-11">
          {selected === 'overview' && <PersonnelOverview name={firstName} onSelect={selectSection} />}
          {selected === 'help' && <HelpDesk />}
        </main>
        <footer className="flex flex-wrap justify-between gap-2 border-t border-[#e7dcde] px-[clamp(18px,4vw,44px)] py-[18px] text-[.67rem] text-[#68595d]"><span>SafeSpeak · College of Computing Studies</span></footer>
      </div>
    </div>
  )
}
