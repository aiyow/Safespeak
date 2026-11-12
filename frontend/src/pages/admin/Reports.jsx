import { useState } from 'react'
import { Inbox,Clock3,MessageCircle,Check,BarChart3,Shapes,UsersRound,CalendarDays } from 'lucide-react'
import { useApiList } from '../../hooks/useApiList.js'
import { FilterBar } from '../../components/FilterBar.jsx'
import { Feedback,Pagination,inputClass } from '../../components/ModuleUI.jsx'
import { StatusBadge } from '../shared/ConcernList.jsx'
import { concernStatuses,statusText } from '../../services/concern-format.js'

const views=[{key:'byStatus',label:'Status',icon:BarChart3,column:'Status'},{key:'byCategory',label:'Category',icon:Shapes,column:'Category',page:'categoryPage'},{key:'byPersonnel',label:'Personnel',icon:UsersRound,column:'Current handler',page:'personnelPage'},{key:'byDate',label:'Date',icon:CalendarDays,column:'Submission date',page:'datePage'}]
export function Reports() {
  const [filters,setFilters]=useState({categoryPage:1,personnelPage:1,datePage:1})
  const [viewKey,setView]=useState('byStatus')
  const options=useApiList('/admin/reports/options'),reports=useApiList('/admin/reports',filters)
  const data=reports.data?.summary?reports.data:null,view=views.find(item=>item.key===viewKey)
  const group=data?.[viewKey],rows=viewKey==='byStatus'?group||[]:group?.data||[]
  function search(event){event.preventDefault();setFilters({...Object.fromEntries([...new FormData(event.currentTarget)].filter(([,value])=>value)),categoryPage:1,personnelPage:1,datePage:1})}
  const metrics=[['Total concerns','total','All matching submissions',Inbox],['Awaiting review','awaitingReview','Submitted or under review',Clock3],['In progress','inProgress','Assigned or being handled',MessageCircle],['Resolved','resolved','Resolved and closed cases',Check]]
  const scope=[filters.from&&`From ${filters.from}`,filters.to&&`To ${filters.to}`,filters.status&&statusText(filters.status),filters.categoryId&&options.data?.categories?.find(item=>item.id===filters.categoryId)?.name,filters.personnelId&&options.data?.personnel?.find(item=>item.id===filters.personnelId)?.name].filter(Boolean)
  return <section>
    <header className="mb-6"><p className="mb-2 text-[.65rem] font-semibold tracking-[.15em] text-[#80515c] uppercase">System insights</p><h1 className="font-[Baskervville,Georgia,serif] text-[clamp(2rem,3vw,2.5rem)] leading-tight">Reports</h1><p className="mt-2 text-sm leading-6 text-[#80616c]">A clearer view of concern activity and outcomes.</p></header>
    <FilterBar hasSearch={false} applied={filters} onSubmit={search} className="mb-4">
      <label className="grid gap-2 text-xs">From<input type="date" name="from" className={inputClass}/></label>
      <label className="grid gap-2 text-xs">To<input type="date" name="to" className={inputClass}/></label>
      <label className="grid gap-2 text-xs">Status<select name="status" className={inputClass}><option value="">All statuses</option>{concernStatuses.map(status=><option key={status} value={status}>{statusText(status)}</option>)}</select></label>
      <label className="grid gap-2 text-xs">Category<select name="categoryId" className={inputClass}><option value="">All categories</option>{options.data?.categories?.map(category=><option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      <label className="grid gap-2 text-xs">Current handler<select name="personnelId" className={inputClass}><option value="">All handlers</option>{options.data?.personnel?.map(person=><option key={person.id} value={person.id}>{person.name}</option>)}</select></label>
    </FilterBar>
    <div className="mb-5 flex flex-wrap items-center gap-2 text-xs text-[#80616c]"><span className="font-medium">{scope.length?'Selected scope':'All time · All concerns'}</span>{scope.map((label,index)=><span key={index} className="rounded-md border border-[#e7dcde] bg-white px-2 py-1">{label}</span>)}</div>
    <Feedback loading={reports.loading||options.loading} error={reports.error||options.error} reload={()=>{reports.reload();options.reload()}}/>
    <dl className="mb-6 grid grid-cols-4 gap-3 max-[950px]:grid-cols-2 max-[380px]:grid-cols-1" aria-label="Report overview">
      {metrics.map(([label,key,description,Icon])=><div key={key} className="min-w-0 rounded-xl border border-[#e7dcde] bg-white p-[18px]"><dt className="flex items-center justify-between gap-2 text-xs text-[#68595d]">{label}<span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#f8edef] text-[#a1354d]"><Icon size={15} aria-hidden="true"/></span></dt><dd className="mt-2 min-h-9 font-[Baskervville,Georgia,serif] text-[2rem] leading-9">{!reports.loading&&!reports.error?(data?.summary[key]||''):''}</dd><dd className="mt-2 text-[.67rem] leading-5 text-[#80616c]">{description}</dd></div>)}
    </dl>
    <section className="min-w-0 overflow-hidden rounded-xl border border-[#e7dcde] bg-white" aria-labelledby="report-breakdown-heading">
      <header className="border-b border-[#e7dcde] px-5 py-5"><h2 id="report-breakdown-heading" className="font-semibold">Concern breakdown</h2><p className="mt-1 text-xs leading-6 text-[#80616c]">Compare totals by status, category, current handler, or submission date.</p></header>
      <nav aria-label="Report breakdown" className="flex gap-1 overflow-x-auto border-b border-[#e7dcde] bg-[#fcf9fa] px-4 py-3">{views.map(({key,label,icon:Icon})=><button type="button" key={key} aria-pressed={key===viewKey} onClick={()=>setView(key)} className={`inline-flex min-h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-xs font-medium transition-colors ${key===viewKey?'bg-[#831f37] text-white shadow-sm':'text-[#80616c] hover:bg-[#f3e8eb]'}`}><Icon size={14} aria-hidden="true"/>{label}</button>)}</nav>
      <div className="relative min-h-40 overflow-x-auto" role="region" aria-label={`${view.label} breakdown`} tabIndex={0}><table className="w-full min-w-[500px] table-fixed border-collapse text-left text-sm"><colgroup><col className="w-[46%]"/><col className="w-[18%]"/><col/></colgroup><thead className="border-b border-[#e7dcde] bg-[#faf6f7] text-[.62rem] tracking-[.08em] text-[#80616c] uppercase"><tr><th className="px-5 py-3 font-medium" scope="col">{view.column}</th><th className="px-4 py-3 text-right font-medium" scope="col">Concerns</th><th className="px-5 py-3 font-medium" scope="col">Share of total</th></tr></thead><tbody className="divide-y divide-[#eee5e7]">{!reports.loading&&rows.map(row=>{const share=data.summary.total?Math.round(row.count/data.summary.total*100):0;return <tr key={row.id||row.status||row.date||'unassigned'}><td className="px-5 py-4 text-[.8rem] [overflow-wrap:anywhere]">{viewKey==='byStatus'?<StatusBadge status={row.status}/>:viewKey==='byDate'?row.date:row.name||'Unassigned'}</td><td className="px-4 py-4 text-right text-[.8rem] font-semibold tabular-nums">{row.count}</td><td className="px-5 py-4"><div className="flex items-center gap-3"><svg viewBox="0 0 100 6" className="h-1.5 min-w-0 flex-1" preserveAspectRatio="none" aria-hidden="true"><rect width="100" height="6" rx="3" className="fill-[#f1e8eb]"/><rect width={share} height="6" rx="3" className="fill-[#af5a70]"/></svg><span className="w-9 text-right text-xs tabular-nums text-[#80616c]">{share}%</span></div></td></tr>})}</tbody></table></div>
      {view.page&&<div className="border-t border-[#e7dcde] px-5 pb-4"><Pagination pagination={group?.pagination||{total:0,pageSize:20}} loading={reports.loading} page={filters[view.page]} onPage={page=>setFilters(previous=>({...previous,[view.page]:page}))}/></div>}
      <p className="border-t border-[#e7dcde] px-5 py-3 text-[.67rem] leading-5 text-[#80616c]">Totals reflect the current status and handler of concerns submitted within the selected dates.</p>
    </section>
  </section>
}
