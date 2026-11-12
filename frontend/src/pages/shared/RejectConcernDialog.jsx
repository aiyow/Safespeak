import { useState } from 'react'
import { api } from '../../services/api.js'
import { useApiList } from '../../hooks/useApiList.js'
import { useNotifications } from '../../context/notificationContext.js'
import { Modal,Feedback,inputClass,buttonClass,primaryClass } from '../../components/ModuleUI.jsx'
export function RejectConcernDialog({id,onClose,onRejected}) {
 const details=useApiList(`/concerns/${id}`),notifications=useNotifications()
 const [reason,setReason]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const concern=details.data?.id?details.data:null
 const allowed=concern?.permissions.coordinate&&['submitted','under_review'].includes(concern.status)&&!concern.handlerName
 async function submit(event){event.preventDefault();if(!reason.trim()){setError('Enter a reason visible to the student.');return}setBusy(true);setError('');try{await api(`/concerns/${id}/status`,{method:'PATCH',data:{updatedAt:concern.updatedAt,status:'rejected',reason:reason.trim()}});notifications.refresh();onRejected()}catch(failure){setError(failure.message)}finally{setBusy(false)}}
 return <Modal title="Reject concern?" busy={busy} onClose={onClose}><Feedback loading={details.loading} error={error||details.error} reload={details.reload}/>{concern&&<><p className="text-xs text-[#80616c]">{concern.referenceNumber}</p><p className="mt-2 font-semibold [overflow-wrap:anywhere]">{concern.title}</p><p className="my-4 text-sm leading-7 text-[#68595d]">Use rejection for unsuitable, duplicate, or troll submissions. The student will see your reason and the case will become read-only. This cannot be undone in this release.</p><form onSubmit={submit}><fieldset disabled={busy||details.loading||!allowed} className="grid gap-4"><label className="grid gap-2 text-sm">Rejection reason<textarea value={reason} onChange={event=>setReason(event.target.value)} required maxLength={5000} rows={4} className={inputClass}/></label><div className="flex flex-wrap justify-end gap-3"><button type="button" className={buttonClass} onClick={onClose}>Cancel</button><button className={primaryClass} disabled={!reason.trim()}>{busy?'Rejecting…':'Confirm rejection'}</button></div></fieldset></form>{!allowed&&<p role="status" className="mt-4 text-sm text-[#872b2b]">This concern is no longer eligible for intake rejection. Refresh the queue.</p>}</>}</Modal>
}
