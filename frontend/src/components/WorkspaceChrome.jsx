import { ChevronRight, MessageCircleCheck } from 'lucide-react'
import { AccountMenu } from './AccountMenu.jsx'
export function WorkspaceAvatar({ name }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()
  return <span className="grid h-[34px] min-w-[34px] place-items-center rounded-full border border-[#efd5da] bg-[#f8edef] px-[5px] text-[.72rem] font-[650] text-[#821c30]" role="img" aria-label={name} title={name}>{initials}</span>
}

export function WorkspaceSidebar({ label, sections, selected, onSelect, children }) {
  return (
    <aside className="sticky top-0 h-svh overflow-auto bg-[linear-gradient(150deg,#3b131b,#1c1618_85%)] px-5 py-8 text-[#faeff0] [scrollbar-width:thin] [scrollbar-color:#a35f70_#301b22] max-[720px]:static max-[720px]:h-auto max-[720px]:px-4 max-[720px]:py-3 [&_nav]:[scrollbar-width:thin] [&_nav]:[scrollbar-color:#a35f70_#301b22] max-[720px]:[&_nav]:flex max-[720px]:[&_nav]:gap-[5px] max-[720px]:[&_nav]:overflow-x-auto max-[720px]:[&_nav]:p-[3px]">
      <div className="flex items-center gap-3 px-2.5 pt-[5px] pb-[25px] [&_svg]:text-[#f48295] [&_strong]:text-[1.45rem] [&_strong]:tracking-[-.04em] max-[720px]:px-0 max-[720px]:pt-1 max-[720px]:pb-2.5">
        <MessageCircleCheck size={34} aria-hidden="true" />
        <strong>SafeSpeak</strong>
      </div>
      <div className="flex items-center gap-2.5 border-y border-[#ffffff13] px-1.5 py-[19px] text-[.71rem] leading-[1.55] [&>span]:shrink-0 [&>span]:rounded-lg [&>span]:border [&>span]:border-[#ffffff18] [&>span]:bg-[#ffffff09] [&>span]:px-1.5 [&>span]:py-2 [&_small]:mt-[3px] [&_small]:block [&_small]:text-[.64rem] [&_small]:text-[#e1c3c9] max-[720px]:hidden">
        <span aria-hidden="true">CCS</span>
        <div><strong>College of Computing Studies</strong><small>Concern management portal</small></div>
      </div>
      <nav aria-label={label}>
        <p className="mx-3 mt-[23px] mb-3 text-[.66rem] tracking-[.14em] text-[#e1c3c9] uppercase max-[720px]:hidden">Your workspace</p>
        {sections.map(({ key, label: sectionLabel, icon: Icon }) => (
          <button
            type="button"
            className="my-[5px] flex min-h-11 w-full items-center gap-3 rounded-[7px] border-0 border-l-[3px] border-transparent bg-transparent px-3 py-[9px] text-left text-[.82rem] font-[630] text-[#e0cbd0] hover:bg-[#ffffff0d] hover:text-white aria-[current=page]:border-l-[#ef6a80] aria-[current=page]:bg-[#ab233a3d] aria-[current=page]:text-[#fff5f7] aria-[current=page]:[&_svg]:text-[#ffa7b5] focus-visible:outline-offset-2 focus-visible:outline-[#ffb6c3] max-[720px]:m-0 max-[720px]:w-auto max-[720px]:shrink-0 max-[720px]:px-2 max-[720px]:whitespace-nowrap"
            key={key}
            aria-current={key === selected ? 'page' : undefined}
            onClick={() => onSelect(key)}
          >
            <Icon size={17} aria-hidden="true" /> {sectionLabel}
          </button>
        ))}
      </nav>
      {children}
    </aside>
  )
}

export function WorkspaceTopbar({ label, section, role, name }) {
  return (
    <header className="sticky top-0 z-30 flex min-h-14 items-center justify-between gap-3 border-b border-[#e7dcde] bg-[#fffafa] px-[clamp(18px,4vw,44px)] py-2">
      <div className="flex min-w-0 items-center gap-2 text-xs [&_svg]:shrink-0 [&_svg]:text-[#907980]">
        <span className="shrink-0 max-[640px]:hidden">{label}</span><ChevronRight size={12} aria-hidden="true" className="max-[640px]:hidden" /><span className="truncate">{section}</span>
      </div>
      <AccountMenu name={name} role={role} />
    </header>
  )
}

export function WorkspaceMetrics({ metrics }) {
  return (
    <dl className="mb-7 grid grid-cols-4 gap-4 max-[1100px]:grid-cols-2 max-[380px]:grid-cols-1" aria-label="Overview counts">
      {metrics.map(({ label, value, detail, icon: Icon }) => (
        <div className="min-w-0 rounded-xl border border-[#e7dcde] bg-[#fffdfd] shadow-[0_4px_18px_#30222606] px-[18px] py-4 [&_dt]:flex [&_dt]:items-center [&_dt]:justify-between [&_dt]:gap-2 [&_dt]:text-[.75rem] [&_dt]:text-[#68595d]" key={label}>
          <dt>{label}<span className="grid size-[31px] shrink-0 place-items-center rounded-lg bg-[#f8edef] text-[#b71f38]"><Icon size={16} aria-hidden="true" /></span></dt>
          <dd className="mt-2 mb-[5px] min-h-[2.365rem] font-[Baskervville,Georgia,serif] text-[2.15rem] leading-[1.1]">{value}</dd>
          <dd className="text-[.7rem] leading-normal text-[#68595d]">{detail}</dd>
        </div>
      ))}
    </dl>
  )
}

export function WorkspaceTable({ id, title, description, columns, action, children }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-[#e7dcde] bg-[#fffdfd] shadow-[0_4px_18px_#30222606]" aria-labelledby={id}>
      <div className="flex items-center justify-between gap-3 px-[clamp(16px,2vw,23px)] py-5">
        <div>
          <h2 id={id} className="mb-1.5 text-[1.01rem] font-semibold leading-[1.35]">{title}</h2>
          {description && <p className="text-[.77rem] leading-[1.65] text-[#68595d]">{description}</p>}
        </div>
        {action}
      </div>
      <div className="min-h-40 overflow-x-auto [scrollbar-width:thin] [scrollbar-color:#b48690_#f2e8ea]" role="region" aria-labelledby={id} tabIndex={0}>
        <table className="w-full min-w-[570px] border-collapse text-left">
          <thead className="border-t border-b border-[#e7dcde] bg-[#f9f5f6] text-[.64rem] tracking-[.07em] text-[#68595d] uppercase">
            <tr>{columns.map(column => <th key={column} scope="col" className="px-[clamp(10px,1.45vw,19px)] py-[13px] font-semibold whitespace-nowrap">{column}</th>)}</tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </section>
  )
}
