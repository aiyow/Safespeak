import { useEffect,useId,useRef,useState } from 'react'
import { Bell } from 'lucide-react'
import { useNotifications } from '../context/notificationContext.js'
import { Feedback,dateText } from './ModuleUI.jsx'

export function NotificationBell({onNavigate}) {
 const notifications=useNotifications(),[open,setOpen]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false)
 const container=useRef(null),trigger=useRef(null),panelId=useId()
 useEffect(()=>{
  if(!open)return
  const outside=event=>{if(!container.current?.contains(event.target))setOpen(false)}
  const escape=event=>{if(event.key==='Escape'){setOpen(false);trigger.current?.focus()}}
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape)
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape)}
 },[open])
 async function select(item){setBusy(true);setError('');try{if(await notifications.openNotification(item,onNavigate))setOpen(false)}catch(failure){setError(failure.message)}finally{setBusy(false)}}
 return <div className="relative max-[480px]:static" ref={container}>
  <button ref={trigger} type="button" aria-label={`Notifications${notifications.count?`, ${notifications.count} unread`:''}`} aria-expanded={open} aria-controls={panelId} onClick={()=>{if(!open)notifications.refresh();setError('');setOpen(previous=>!previous)}} className="relative grid size-8 shrink-0 place-items-center rounded-lg border border-[#e7dcde] bg-white text-[#80616c] hover:bg-[#f8edef]"><Bell size={16} strokeWidth={1.7} aria-hidden="true"/>{notifications.count>0&&<span aria-hidden="true" className="absolute -top-1.5 -right-1.5 min-w-4 rounded-full border border-white bg-[#e9e5e6] px-1 text-center text-[.55rem] font-semibold leading-4 text-[#494247]">{notifications.count>99?'99+':notifications.count}</span>}</button>
  {open&&<section id={panelId} aria-label="Notifications" className="absolute top-[calc(100%+10px)] right-0 z-50 w-[330px] max-w-[calc(100vw-32px)] overflow-hidden rounded-xl border border-[#e7dcde] bg-white text-[#352129] shadow-xl max-[480px]:absolute max-[480px]:top-[calc(100%+8px)] max-[480px]:right-4">
   <h2 className="border-b border-[#e7dcde] px-4 py-3 text-sm font-semibold">Notifications</h2>
   <div className="max-h-[55svh] overflow-y-auto px-4"><Feedback loading={notifications.loading} error={error||notifications.error} reload={notifications.refresh}/><ul className="divide-y divide-[#e7dcde]">{notifications.data.map(item=><li key={item.id} className="py-3">{item.target?<button disabled={busy} type="button" className="w-full text-left text-xs leading-6 hover:underline" onClick={()=>select(item)}><span className={item.isRead?'text-[#80616c]':'font-semibold'}>{item.message}</span><span className="mt-1 block text-[.65rem] text-[#80616c]">{dateText(item.createdAt)}{!item.isRead?' · Unread':''}</span></button>:<p className="text-xs leading-6 text-[#80616c]">{item.message}<span className="block text-[.65rem]">{dateText(item.createdAt)}</span></p>}</li>)}</ul></div>
   <button type="button" className="min-h-11 w-full border-t border-[#e7dcde] px-4 py-3 text-left text-xs font-semibold text-[#831f37] hover:bg-[#f8edef]" onClick={()=>{if(onNavigate({kind:'notifications'})!==false)setOpen(false)}}>View all notifications</button>
  </section>}
 </div>
}
