import { useId, useState } from 'react'
import { Search, SlidersHorizontal, ChevronDown } from 'lucide-react'
import { inputClass, buttonClass } from './ModuleUI.jsx'

// Collapsing controls changes their presentation, not the user's applied selections.
export function FilterBar({ children, onSubmit, applied = {}, hasSearch = true, searchLabel = 'Search', placeholder = 'Search', maxLength = 200, submitLabel = 'Search', className = '', actions, embedded = false }) {
  const [open,setOpen] = useState(false)
  const panelId = useId()
  const count = Object.entries(applied).filter(([key,value]) => !['search','page','pageSize','categoryPage','personnelPage','datePage'].includes(key) && value && !['all','false'].includes(value)).length
  return <form onSubmit={onSubmit} className={`min-w-0 ${embedded?'':'rounded-xl border border-[#e7dcde] bg-white p-4'} ${className}`}>
    <div className={`flex min-w-0 flex-wrap items-start gap-x-3 gap-y-3 ${hasSearch?'lg:flex-nowrap':''}`}>
      {hasSearch ? <label className={`grid min-w-0 basis-[200px] gap-2 text-xs transition-[flex-grow] duration-300 motion-reduce:transition-none lg:basis-0 ${open?'grow':'grow-[4]'}`}>
        {searchLabel}<span className="relative block min-w-0"><Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#9a848b]" aria-hidden="true"/><input name="search" defaultValue={applied.search||''} placeholder={placeholder} maxLength={maxLength} className={`${inputClass} w-full pl-10`}/></span>
      </label> : <p className="min-w-0 flex-1 self-center text-sm font-medium text-[#68595d]">Filters{count>0&&<span className="ml-2 rounded-full bg-[#f8edef] px-2 py-0.5 text-xs text-[#831f37]">{count} active</span>}</p>}
      <div id={panelId} inert={!open} aria-hidden={!open} className={`grid min-w-0 overflow-hidden transition-[flex-grow,opacity,grid-template-rows] duration-300 motion-reduce:transition-none ${hasSearch?'order-last basis-full lg:order-none lg:basis-0':'order-last basis-full'} ${open?'grow-[2] grid-rows-[1fr] opacity-100':'grow-0 grid-rows-[0fr] opacity-0'}`}>
        <div className="min-h-0 min-w-0 overflow-hidden"><div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,140px),1fr))] gap-3 lg:grid-cols-[repeat(auto-fit,minmax(110px,1fr))] [&_label]:min-w-0 [&_input]:w-full [&_select]:w-full">{children}</div></div>
      </div>
      <div className={`flex shrink-0 flex-wrap items-center gap-2 ${hasSearch?'lg:pt-[22px]':''}`}>
        {(hasSearch||open)&&<button className={buttonClass}>{hasSearch?submitLabel:'Apply filters'}</button>}
        <button type="button" aria-expanded={open} aria-controls={panelId} onClick={()=>setOpen(value=>!value)} className={`${buttonClass} gap-2 whitespace-nowrap`}><SlidersHorizontal size={15} aria-hidden="true"/>{open?'Hide filters':'Show filters'}{!open&&count>0&&<span className="rounded-full bg-[#f8edef] px-1.5 text-xs">{count}</span>}<ChevronDown size={13} className={`transition-transform duration-300 motion-reduce:transition-none ${open?'rotate-180':''}`} aria-hidden="true"/></button>
        {actions}
      </div>
    </div>
  </form>
}
