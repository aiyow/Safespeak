import { useEffect,useState } from 'react'
import { Search,Plus,Minus,MessageCircle,ArrowRight } from 'lucide-react'
import { useApiList } from '../../hooks/useApiList.js'
import { useAuth } from '../../context/authContext.js'
import { Feedback,Pagination,inputClass } from '../../components/ModuleUI.jsx'
export function HelpDesk({onNavigate}) {
  const {user}=useAuth()
  const [input,setInput]=useState(''),[search,setSearch]=useState(''),[page,setPage]=useState(1)
  const list=useApiList('/faqs',{search,page}),settings=useApiList('/settings')
  useEffect(()=>{const timer=setTimeout(()=>{setSearch(input.trim());setPage(1)},300);return()=>clearTimeout(timer)},[input])
  const student=user.role==='student',destination=student?'submit':user.isIntakeCoordinator?'queue':'assignments'
  const action=student?'Submit a concern':user.isIntakeCoordinator?'View concern queue':'View my assignments'
  return <section>
    <header className="mb-7"><p className="mb-3 text-[.65rem] font-medium tracking-[.17em] text-[#80515c] uppercase">A little guidance</p><h1 className="font-[Baskervville,Georgia,serif] text-[clamp(2rem,3.3vw,2.7rem)] leading-tight">We’re here to help.</h1><p className="mt-3 text-[.82rem] leading-6 text-[#80616c]">Find your way around SafeSpeak, one answer at a time.</p></header>
    <div className="grid min-w-0 grid-cols-[minmax(0,2.8fr)_minmax(235px,1fr)] items-start gap-6 max-[950px]:grid-cols-1">
      <div className="min-w-0"><form className="relative mb-6" role="search" onSubmit={event=>{event.preventDefault();setSearch(input.trim());setPage(1)}}><Search size={16} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[#a48991]" aria-hidden="true"/><input value={input} onChange={event=>setInput(event.target.value)} aria-label="Search FAQs" placeholder="What would you like to know?" maxLength={300} className={`${inputClass} h-11 w-full pl-11 text-[.8rem]`}/></form>
        <h2 id="help-faq-heading" className="mb-3 text-[.6rem] font-medium tracking-[.15em] text-[#80616c] uppercase">Frequently asked questions</h2><Feedback {...list} reload={list.reload}/><div aria-labelledby="help-faq-heading" className="min-h-4 overflow-hidden rounded-xl border border-[#e7dcde] bg-white">{!list.loading&&list.data.map(faq=><details key={faq.id} className="group border-b border-[#e7dcde] last:border-b-0"><summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-5 px-[22px] py-5 text-[.8rem] leading-6 text-[#352129] hover:bg-[#fdf9fa] [&::-webkit-details-marker]:hidden"><span className="min-w-0 [overflow-wrap:anywhere]">{faq.question}</span><Plus size={14} className="shrink-0 text-[#a48991] group-open:hidden" aria-hidden="true"/><Minus size={14} className="hidden shrink-0 text-[#a48991] group-open:block" aria-hidden="true"/></summary><p className="px-[22px] pt-0 pb-6 text-[.8rem] leading-7 whitespace-pre-wrap text-[#80616c] [overflow-wrap:anywhere]">{faq.answer}</p></details>)}</div><Pagination {...list} page={page} onPage={setPage}/>
      </div>
      <aside className="min-w-0 rounded-xl border border-[#e7dcde] bg-white p-6"><MessageCircle size={27} strokeWidth={1.5} className="mb-5 text-[#a07885]" aria-hidden="true"/><h2 className="font-[Baskervville,Georgia,serif] text-[1.6rem] leading-[1.18]">Start with<br/>a conversation.</h2><p className="mt-4 text-xs leading-6 text-[#80616c]">{student?'Have something on your mind? Share your concern and the support you need.':'Review concerns, respond thoughtfully, and help students find their next step.'}</p><button type="button" onClick={()=>onNavigate(destination)} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-3 rounded-lg bg-[#b71f38] px-3 py-2 text-[.7rem] font-semibold text-white shadow-sm hover:bg-[#99182e]">{action}<ArrowRight size={14} aria-hidden="true"/></button>
        <section className="mt-6 border-t border-[#e7dcde] pt-5"><h3 className="text-[.65rem] font-semibold tracking-[.1em] text-[#80616c] uppercase">Help Desk information</h3><Feedback {...settings} reload={settings.reload}/>{!settings.loading&&<div className="mt-3 grid gap-3 text-xs leading-6 text-[#80616c]">{settings.data.helpEmail&&<a href={`mailto:${settings.data.helpEmail}`} className="text-[#831f37] underline [overflow-wrap:anywhere]">{settings.data.helpEmail}</a>}{settings.data.officeHours&&<div><h4 className="font-semibold">Office hours</h4><p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{settings.data.officeHours}</p></div>}{settings.data.supportMessage&&<p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{settings.data.supportMessage}</p>}</div>}</section>
      </aside>
    </div>
  </section>
}
