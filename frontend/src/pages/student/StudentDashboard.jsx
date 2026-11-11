import { HelpDesk } from '../shared/HelpDesk.jsx'
import { useState } from 'react'
import { ArrowRight, Check, CircleHelp, Clock3, Inbox, LayoutGrid, Leaf, MessageCircle, MessageSquareText, Plus, ShieldCheck } from 'lucide-react'
import { WorkspaceAvatar, WorkspaceMetrics, WorkspaceSidebar, WorkspaceTable, WorkspaceTopbar } from '../../components/WorkspaceChrome.jsx'
import { useAuth } from '../../context/authContext.js'

const sections = [
  { key: 'overview', label: 'Overview', icon: LayoutGrid },
  { key: 'submit', label: 'Submit a concern', icon: Plus },
  { key: 'concerns', label: 'My concerns', icon: Inbox },
  { key: 'help', label: 'Help desk & FAQ', icon: CircleHelp },
]

const metrics = [
  { label: 'Total concerns', value: '', detail: 'All your submissions', icon: Inbox },
  { label: 'Awaiting review', value: '', detail: 'Awaiting an initial review', icon: Clock3 },
  { label: 'In progress', value: '', detail: 'Being reviewed or addressed', icon: MessageSquareText },
  { label: 'Resolved', value: '', detail: 'A step forward, together', icon: Check },
]

const steps = [
  { title: 'Share your concern', description: 'Tell us what happened and how you would like to be supported.', icon: MessageSquareText },
  { title: 'Stay in the loop', description: 'View responses and updates right here in your portal.', icon: MessageCircle },
  { title: 'Move forward', description: 'Follow the progress from submission to resolution.', icon: Check },
]

function StudentOverview({ name, onSelect }) {
  return (
    <>
      <div className="mb-7 flex items-center justify-between gap-[18px] max-[720px]:flex-col max-[720px]:items-start">
        <div>
          <p className="mb-3 text-[.67rem] font-[660] tracking-[.15em] text-[#80515c] uppercase">Your student space</p>
          <h1 className="font-[Baskervville,Georgia,serif] text-[clamp(2rem,3.1vw,2.7rem)] leading-[1.13] font-normal tracking-[-.033em]">Hello, {name}.</h1>
          <p className="mt-3 text-[.85rem] leading-[1.6] text-[#68595d]">A space to be heard. A clearer path forward.</p>
        </div>
        <button type="button" onClick={() => onSelect('submit')} className="inline-flex min-h-[42px] shrink-0 items-center gap-2.5 rounded-lg bg-[#b71f38] px-4 py-[9px] text-[.79rem] font-[650] text-white shadow-[0_3px_8px_#af1e351c] hover:bg-[#99182e]">
          <Plus size={16} aria-hidden="true" /> Submit a concern
        </button>
      </div>

      <section className="mb-6 flex min-h-[244px] items-center justify-between gap-6 rounded-[13px] border border-[#eacbd2] bg-[linear-gradient(120deg,#faefef,#f2dde2)] px-[clamp(20px,3vw,32px)] py-7" aria-labelledby="student-hero-title">
        <div className="max-w-[490px]">
          <p className="mb-3 flex items-center gap-[7px] text-[.67rem] font-[660] tracking-[.15em] text-[#8c3448] uppercase"><Leaf size={15} aria-hidden="true" /> Better together</p>
          <h2 id="student-hero-title" className="font-[Baskervville,Georgia,serif] text-[clamp(1.65rem,2.5vw,2.05rem)] leading-[1.15] font-normal tracking-[-.025em] text-[#4a1c29]">Small conversations.<br />Meaningful change.</h2>
          <p className="mt-[13px] text-[.79rem] leading-[1.8] text-[#68595d]">From academic questions to campus concerns, your experiences can help shape a better CCS community.</p>
          <button type="button" onClick={() => onSelect('submit')} className="mt-5 inline-flex items-center gap-2.5 text-[.77rem] font-[650] text-[#971b31] hover:underline">Let your voice be heard <ArrowRight size={14} aria-hidden="true" /></button>
        </div>
        <div className="relative mr-[clamp(0px,2vw,30px)] grid size-[154px] shrink-0 place-items-center rounded-full bg-[#edd0d8] text-[#b43c59] max-[600px]:hidden" aria-hidden="true">
          <MessageSquareText size={100} strokeWidth={1} className="-translate-x-3 -translate-y-1 fill-[#fff7f8]" />
          <span className="absolute right-0 bottom-4 grid h-14 w-[74px] place-items-center rounded-2xl border border-[#c5667e] bg-[#e5b2c1]"><Check size={32} strokeWidth={1.4} /></span>
        </div>
      </section>

      <WorkspaceMetrics metrics={metrics} />
      <WorkspaceTable
        id="student-concerns-title"
        title="Your recent concerns"
        description="A little clarity on where things stand."
        columns={['Concern', 'Status', 'Submitted', 'Details']}
        action={<button type="button" onClick={() => onSelect('concerns')} className="inline-flex items-center gap-[7px] py-1.5 text-[.77rem] font-[660] whitespace-nowrap text-[#971b31] hover:underline">View all <ArrowRight size={14} aria-hidden="true" /></button>}
      />

      <section className="mt-7 rounded-xl border border-[#e7dcde] bg-[#fffdfd] p-[clamp(20px,3vw,30px)]" aria-labelledby="student-guidance-title">
        <h2 id="student-guidance-title" className="font-[Baskervville,Georgia,serif] text-[1.7rem] leading-tight">We're here to listen.</h2>
        <div className="mt-6 grid grid-cols-3 gap-6 max-[720px]:grid-cols-1">
          {steps.map(({ title, description, icon: Icon }) => (
            <div key={title}>
              <span className="mb-3 grid size-9 place-items-center rounded-lg bg-[#f8edef] text-[#b71f38]"><Icon size={18} aria-hidden="true" /></span>
              <h3 className="text-[.88rem] font-semibold">{title}</h3>
              <p className="mt-2 text-[.79rem] leading-[1.7] text-[#68595d]">{description}</p>
            </div>
          ))}
        </div>
      </section>
      <div className="mt-6 grid grid-cols-2 gap-6 max-[720px]:grid-cols-1">
        <section className="rounded-xl border border-[#e7dcde] bg-[#fffdfd] p-6" aria-labelledby="student-care-title">
          <ShieldCheck size={22} className="mb-3 text-[#b71f38]" aria-hidden="true" />
          <h2 id="student-care-title" className="text-[.95rem] font-semibold">Your voice, treated with care.</h2>
          <p className="mt-2 text-[.79rem] leading-[1.7] text-[#68595d]">Share the details relevant to your concern and the support you would like.</p>
        </section>
        <section className="rounded-xl border border-[#e7dcde] bg-[#fffdfd] p-6" aria-labelledby="student-help-title">
          <CircleHelp size={22} className="mb-3 text-[#b71f38]" aria-hidden="true" />
          <h2 id="student-help-title" className="text-[.95rem] font-semibold">A little guidance can go a long way.</h2>
          <p className="mt-2 text-[.79rem] leading-[1.7] text-[#68595d]">Find answers about submitting and following up on your concerns.</p>
          <button type="button" onClick={() => onSelect('help')} className="mt-4 inline-flex items-center gap-2 text-[.77rem] font-[650] text-[#971b31] hover:underline">Visit the help desk <ArrowRight size={14} aria-hidden="true" /></button>
        </section>
      </div>
    </>
  )
}

export function StudentDashboard() {
  const { user } = useAuth()
  const [selected, setSelected] = useState('overview')
  const section = sections.find(item => item.key === selected)
  const firstName = user.fullName.trim().split(/\s+/)[0]

  function selectSection(key) {
    setSelected(key)
    window.scrollTo(0, 0)
  }

  return (
    <div className="grid min-h-svh grid-cols-[238px_minmax(0,1fr)] bg-[#f7f4f4] text-[#271d20] [&_:focus-visible]:outline-[#b71f38] max-[720px]:grid-cols-1" data-role="student">
      <WorkspaceSidebar label="Student workspace" sections={sections} selected={selected} onSelect={selectSection}>
        <div className="mt-10 px-2.5 max-[720px]:hidden">
          <ShieldCheck size={23} className="mb-4 text-[#f48295]" aria-hidden="true" />
          <p className="font-[Baskervville,Georgia,serif] text-[1.2rem] leading-[1.4]">A thoughtful space.<br />A better campus.</p>
          <div className="mt-6 flex items-center gap-2.5 border-t border-[#ffffff18] pt-4">
            <WorkspaceAvatar name={user.fullName} />
            <span className="min-w-0"><strong className="block text-[.74rem] [overflow-wrap:anywhere]">{user.fullName}</strong><small className="mt-1 block text-[.67rem] text-[#e1c3c9]">Student</small></span>
          </div>
        </div>
      </WorkspaceSidebar>
      <div className="flex min-w-0 flex-col">
        <WorkspaceTopbar label="Student portal" section={section.label} role="Student" name={user.fullName} />
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-[clamp(18px,4vw,44px)] pt-9 pb-11">
          {selected === 'overview' && <StudentOverview name={firstName} onSelect={selectSection} />}
          {selected === 'help' && <HelpDesk />}
        </main>
        <footer className="border-t border-[#e7dcde] px-[clamp(18px,4vw,44px)] py-[18px] text-[.67rem] text-[#68595d]">SafeSpeak · College of Computing Studies</footer>
      </div>
    </div>
  )
}
