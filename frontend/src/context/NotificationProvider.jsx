import { useCallback,useEffect,useRef,useState } from 'react'
import { useAuth } from './authContext.js'
import { NotificationContext } from './notificationContext.js'
import { api } from '../services/api.js'

function NotificationStore({userId,children}) {
 const [state,setState]=useState({count:0,data:[],loading:!!userId,error:'',version:0})
 const active=useRef(null),expired=useRef(false)
 const refresh=useCallback(async()=>{
  if(!userId||document.hidden||expired.current)return
  active.current?.abort();const controller=new AbortController();active.current=controller
  try{
   const [count,list]=await Promise.all([api('/notifications/unread-count',{signal:controller.signal}),api('/notifications',{params:{pageSize:5},signal:controller.signal})])
   if(!controller.signal.aborted)setState(previous=>({count:count.data.count,data:list.data,loading:false,error:'',version:previous.version+1}))
  }catch(failure){if(!controller.signal.aborted){if(failure.status===401)expired.current=true;setState(previous=>({...previous,count:failure.status===401?0:previous.count,data:failure.status===401?[]:previous.data,loading:false,error:failure.message}))}}
 },[userId])
 useEffect(()=>{
  if(!userId)return
  refresh();const interval=setInterval(refresh,30000)
  const visible=()=>{if(!document.hidden)refresh()}
  window.addEventListener('focus',visible);document.addEventListener('visibilitychange',visible)
  return()=>{clearInterval(interval);active.current?.abort();window.removeEventListener('focus',visible);document.removeEventListener('visibilitychange',visible)}
 },[refresh,userId])
 const markRead=async id=>{await api(`/notifications/${id}/read`,{method:'PATCH',data:{}});await refresh()}
 const markAllRead=async()=>{await api('/notifications/read-all',{method:'POST',data:{}});await refresh()}
 async function openNotification(item,onNavigate) {
  const current=(await api(`/notifications/${item.id}`)).data
  if(!current.target){await refresh();throw new Error('This update no longer links to a record available to this account.')}
  if(onNavigate(current.target)===false)return false
  await markRead(item.id);return true
 }
 return <NotificationContext.Provider value={{...state,refresh,markRead,markAllRead,openNotification}}>{children}</NotificationContext.Provider>
}
export function NotificationProvider({children}) {
 const {user}=useAuth()
 return <NotificationStore key={user?.id||'anonymous'} userId={user?.id}>{children}</NotificationStore>
}
