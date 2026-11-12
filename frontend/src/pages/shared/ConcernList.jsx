import { useState } from 'react'
import { useApiList } from '../../hooks/useApiList.js'
import { WorkspaceTable } from '../../components/WorkspaceChrome.jsx'
import { Feedback, Pagination, inputClass, buttonClass, dateText, ModuleTitle } from '../../components/ModuleUI.jsx'
import { concernStatuses, statusText } from '../../services/concern-format.js'
import { FilterBar } from '../../components/FilterBar.jsx'
import { RejectConcernDialog } from './RejectConcernDialog.jsx'
export function StatusBadge({ status }) {
  const color = ['resolved','closed'].includes(status) ? 'bg-[#edf7f1] text-[#28704b]' : status === 'rejected' ? 'bg-[#fff1f0] text-[#a33c3c]' : 'bg-[#f8edef] text-[#831f37]'
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${color}`}>{statusText(status)}</span>
}
export function ConcernRows({ rows, onOpen, staff = false, onReject }) {
  return rows.map(row => <tr key={row.id} className="border-t border-[#e7dcde] text-sm">
    <td className="p-4"><p className="text-xs text-[#806b73]">{row.referenceNumber}</p><button className="mt-1 text-left font-semibold text-[#831f37] hover:underline [overflow-wrap:anywhere]" onClick={() => onOpen(row.id)}>{row.title}</button>{staff && <p className="mt-1 text-xs text-[#806b73]">{row.studentName}</p>}</td>
    <td className="p-4 text-xs">{row.categoryName}</td><td className="p-4"><StatusBadge status={row.status} /></td>
    {staff && <td className="p-4 text-xs">{row.handlerName}</td>}<td className="p-4 text-xs whitespace-nowrap">{dateText(row.createdAt)}</td>
    <td className="p-4"><div className="flex gap-2"><button type="button" className={buttonClass} onClick={() => onOpen(row.id)}>Details<span className="sr-only"> {row.referenceNumber}</span></button>{onReject&&['submitted','under_review'].includes(row.status)&&!row.handlerName&&<button type="button" className={`${buttonClass} border-[#efd3d7] text-[#aa2d40]`} onClick={()=>onReject(row.id)}>Reject<span className="sr-only"> {row.referenceNumber}</span></button>}</div></td>
  </tr>)
}
export function ConcernList({ title, view, staff = false, coordinator = false, onOpen }) {
  const [filters,setFilters] = useState({page:1})
  const [rejecting,setRejecting] = useState(null)
  const list = useApiList('/concerns',{...filters,view})
  function search(event) { event.preventDefault(); setFilters({...Object.fromEntries([...new FormData(event.currentTarget)].filter(([,value])=>value)),page:1}) }
  return <section><ModuleTitle>{title}</ModuleTitle>
    <FilterBar onSubmit={search} applied={filters} placeholder={staff?'Search reference, title, or student':'Search reference or title'} className="mb-5">
      <label className="grid flex-[1_1_140px] gap-2 text-xs">Status<select name="status" className={inputClass}><option value="">All statuses</option>{concernStatuses.map(status=><option key={status} value={status}>{statusText(status)}</option>)}</select></label>
      <label className="grid flex-[1_1_160px] gap-2 text-xs">Category<select name="categoryId" className={inputClass}><option value="">All categories</option>{list.categories?.map(category=><option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      {coordinator && <><label className="grid flex-[1_1_160px] gap-2 text-xs">Assigned to<select name="assigneeId" className={inputClass}><option value="">All personnel</option>{list.assignees?.map(person=><option key={person.id} value={person.id}>{person.name}</option>)}</select></label><label className="grid gap-2 text-xs">From<input type="date" name="from" className={inputClass} /></label><label className="grid gap-2 text-xs">To<input type="date" name="to" className={inputClass} /></label></>}
    </FilterBar>
    <Feedback {...list} reload={list.reload} />
    <WorkspaceTable id={`concern-list-${view}`} title={title} columns={['Concern','Category','Status',...(staff?['Assigned to']:[]),'Submitted','Actions']}><ConcernRows rows={list.loading?[]:list.data} staff={staff} onOpen={onOpen} onReject={coordinator?setRejecting:undefined}/></WorkspaceTable>
    <Pagination {...list} page={filters.page} onPage={page=>setFilters(previous=>({...previous,page}))}/>
    {rejecting&&<RejectConcernDialog id={rejecting} onClose={()=>setRejecting(null)} onRejected={()=>{setRejecting(null);list.reload()}}/>}
  </section>
}
