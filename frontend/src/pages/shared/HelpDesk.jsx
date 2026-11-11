import { useState } from 'react'
import { useApiList } from '../../hooks/useApiList.js'
import { ModuleTitle, Feedback, Pagination, inputClass, buttonClass } from '../../components/ModuleUI.jsx'
export function HelpDesk() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const list = useApiList('/faqs', { search, page })
  return <section><ModuleTitle>Help Desk & FAQ</ModuleTitle><form className="mb-5 flex flex-wrap gap-3" onSubmit={event => { event.preventDefault(); setSearch(new FormData(event.currentTarget).get('search')); setPage(1) }}><input name="search" aria-label="Search FAQs" placeholder="Search questions and answers" maxLength={300} className={`${inputClass} flex-1`} /><button className={buttonClass}>Search</button></form><Feedback {...list} /><div className="overflow-hidden rounded-xl border border-[#e7dcde] bg-white">{!list.loading && list.data.map(faq => <details key={faq.id} className="border-b border-[#e7dcde] p-5 last:border-b-0"><summary className="cursor-pointer font-semibold [overflow-wrap:anywhere]">{faq.question}</summary><p className="mt-4 text-sm leading-7 whitespace-pre-wrap text-[#68595d] [overflow-wrap:anywhere]">{faq.answer}</p></details>)}</div><Pagination {...list} page={page} onPage={setPage} /></section>
}
