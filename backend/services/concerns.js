import { createHash,randomUUID } from 'node:crypto';
import { mkdir,open,unlink } from 'node:fs/promises';
import { resolve,extname,basename,dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../config/db.js';
import { notifyEvent } from './notifications.js';
import { portalSettings } from './portal-settings.js';
const backend=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const uploadRoot=resolve(backend,process.env.UPLOAD_DIR||'storage/uploads');
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
export function inspectFile(file) {
 const ext=extname(file.originalname).toLowerCase();const b=file.buffer;let mime;
 if(b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))mime='image/png';
 else if(b.length>=3&&b[0]===255&&b[1]===216&&b[2]===255)mime='image/jpeg';
 else if(b.subarray(0,5).toString()==='%PDF-')mime='application/pdf';
 const extensions={'image/png':['.png'],'image/jpeg':['.jpg','.jpeg'],'application/pdf':['.pdf']};
 if(!mime||!extensions[mime].includes(ext)||file.mimetype!==mime||b.length===0||b.length>5*1024*1024)throw fail('Attach valid PDF, JPEG, or PNG files up to 5 MB each.');
 return {...file,mime,originalName:basename(file.originalname.replaceAll('\\','/')).slice(0,255)};
}
export async function submitConcern(studentId,input,files) {
 const checked=files.map(inspectFile);
 const fingerprint=createHash('sha256').update(JSON.stringify([input.title,input.categoryId,input.description,checked.map(file=>[file.originalName,file.mime,createHash('sha256').update(file.buffer).digest('hex')])])).digest('hex');
 const client=await pool.connect();const written=[];let committed=false;
 try {
  await client.query('BEGIN');
  const student=(await client.query('SELECT role,is_active FROM public.users WHERE id=$1 FOR SHARE',[studentId])).rows[0];
  if(!student?.is_active||student.role!=='student')throw fail('Student access is required.',403);
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`submission:${studentId}:${input.clientSubmissionId}`]);
  const prior=(await client.query('SELECT id,reference_no AS "referenceNumber",status,created_at AS "createdAt",submission_hash FROM public.concerns WHERE student_id=$1 AND client_submission_id=$2',[studentId,input.clientSubmissionId])).rows[0];
  if(prior){if(prior.submission_hash!==fingerprint)throw fail('This submission was already received with different content. Start a new submission.',409);delete prior.submission_hash;await client.query('COMMIT');committed=true;return {...prior,repeated:true};}
  await client.query('SELECT pg_advisory_xact_lock_shared(7024,3)');
  const admission=(await portalSettings(client)).data;
  if(!admission.acceptSubmissions)throw fail(`Submissions are temporarily closed. ${admission.closedMessage}`,409);
  const category=(await client.query('SELECT is_active FROM public.concern_categories WHERE id=$1 FOR SHARE',[input.categoryId])).rows[0];
  if(!category?.is_active)throw fail('Choose an active concern category.');
  const concern=(await client.query(`INSERT INTO public.concerns(student_id,category_id,title,description,status,is_anonymous,client_submission_id,submission_hash) VALUES($1,$2,$3,$4,'submitted',false,$5,$6) RETURNING id,reference_no AS "referenceNumber",status,created_at AS "createdAt"`,[studentId,input.categoryId,input.title,input.description,input.clientSubmissionId,fingerprint])).rows[0];
  await mkdir(uploadRoot,{recursive:true});
  for(const file of checked){const key=randomUUID();const path=resolve(uploadRoot,key);const handle=await open(path,'wx',0o600);written.push(path);try{await handle.writeFile(file.buffer);}finally{await handle.close();}await client.query('INSERT INTO public.concern_attachments(concern_id,uploaded_by,original_name,storage_path,mime_type,file_size_bytes) VALUES($1,$2,$3,$4,$5,$6)',[concern.id,studentId,file.originalName,key,file.mime,file.buffer.length]);}
  await client.query("INSERT INTO public.concern_status_history(concern_id,old_status,new_status,changed_by,reason) VALUES($1,NULL,'submitted',$2,'Student submitted concern')",[concern.id,studentId]);
  const audit=(await client.query("INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,details) VALUES($1,'concern.submitted','concern',$2,$3) RETURNING id",[studentId,concern.id,{actor:{role:'student'},after:{referenceNumber:concern.referenceNumber,categoryId:input.categoryId,attachmentCount:checked.length,status:'submitted'}}])).rows[0];
  await notifyEvent(client,{eventId:audit.id,actorId:studentId,type:'concern.submitted',concernId:concern.id});
  await client.query('COMMIT');committed=true;return {...concern,repeated:false};
 } catch(error){await client.query('ROLLBACK');throw error;}finally{if(!committed)await Promise.allSettled(written.map(path=>unlink(path)));client.release();}
}
