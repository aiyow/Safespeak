import { Router,json } from 'express';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import { z } from 'zod';
import { resolve,basename } from 'node:path';
import { access } from 'node:fs/promises';
import { pool } from '../config/db.js';
import { requireSession } from '../middleware/session.js';
import { originGuard,validate,apiError } from '../middleware/api.js';
import { submitConcern,uploadRoot } from '../services/concerns.js';
import { createReferral } from '../services/referrals.js';
import { statuses,listConcerns,concernSummary,concernDetails,concernHistory,concernMessages,eligiblePersonnel,mutateConcern } from '../services/concern-workflow.js';
const router=Router();
router.use(originGuard,cookieParser(),requireSession);
const upload=multer({storage:multer.memoryStorage(),limits:{files:3,fileSize:5*1024*1024,fields:4,fieldSize:24000,parts:8}}).array('attachments',3);
const schema=z.strictObject({clientSubmissionId:z.uuid(),title:z.string().trim().min(1,'Enter a title.').max(200),categoryId:z.uuid('Choose a category.'),description:z.string().trim().min(1,'Describe your concern.').max(5000)});
router.post('/',(req,res,next)=>req.user.role==='student'?next():res.status(403).json({message:'Student access is required.'}),(req,res,next)=>req.is('multipart/form-data')?upload(req,res,next):res.status(415).json({message:'Use multipart/form-data.'}),async(req,res)=>{
 const result=await submitConcern(req.user.id,validate(schema,req.body),req.files||[]);res.status(result.repeated?200:201).json({data:result});
});
router.get('/attachments/:id',async(req,res,next)=>{
 const id=validate(z.uuid(),req.params.id);
 // One query checks the current role, account state, and assignment before returning metadata.
 const {rows:[file]}=await pool.query(`SELECT a.original_name,a.storage_path,a.mime_type FROM public.concern_attachments a JOIN public.concerns c ON c.id=a.concern_id JOIN public.users u ON u.id=$2 WHERE a.id=$1 AND u.is_active AND ((u.role='student' AND c.student_id=u.id) OR (u.role='personnel' AND (u.is_intake_coordinator OR EXISTS(SELECT 1 FROM public.concern_assignments x WHERE x.concern_id=c.id AND x.assigned_to=u.id AND x.ended_at IS NULL))))`,[id,req.user.id]);
 if(!file)return res.status(404).json({message:'Attachment not found.'});
 if(file.storage_path!==basename(file.storage_path)||!z.uuid().safeParse(file.storage_path).success)return res.status(404).json({message:'Attachment not found.'});
 const path=resolve(uploadRoot,file.storage_path);
 try{await access(path);}catch{return res.status(404).json({message:'Attachment file is unavailable.'});}
 res.set({'X-Content-Type-Options':'nosniff','Content-Type':'application/octet-stream'});
 if(req.query.preview==='1'){
  if(!['image/png','image/jpeg'].includes(file.mime_type))return res.status(415).json({message:'Only PNG and JPEG attachments support image previews.'});
  res.set({'Content-Type':file.mime_type,'Content-Disposition':'inline'});
  return res.sendFile(path,error=>{if(error)next(error);});
 }
 res.download(path,file.original_name,error=>{if(error)next(error);});
});
// Keep multipart submission separate from bounded JSON workflow actions.
router.use(json({limit:'32kb'}),(req,res,next)=>['POST','PATCH'].includes(req.method)&&!req.is('application/json')?res.status(415).json({message:'Use application/json for this request.'}):next());
const page=z.object({page:z.coerce.number().int().min(1).max(1000000).default(1),pageSize:z.coerce.number().int().min(1).max(100).default(20)});
const listQuery=page.extend({view:z.enum(['mine','queue','assigned']).optional(),search:z.string().trim().max(200).default(''),status:z.enum(statuses).optional(),categoryId:z.uuid().optional(),assigneeId:z.uuid().optional(),from:z.iso.date().optional(),to:z.iso.date().optional()}).refine(q=>!q.from||!q.to||q.from<=q.to,'The end date must follow the start date.');
const revision=z.string().min(1).max(60);
const text=z.string().trim().min(1,'Enter the required text.').max(5000);
const id=req=>validate(z.uuid(),req.params.id);
router.get('/',async(req,res)=>res.json(await listConcerns(req.user.id,validate(listQuery,req.query))));
router.get('/summary',async(req,res)=>res.json(await concernSummary(req.user.id)));
router.get('/:id',async(req,res)=>res.json(await concernDetails(req.user.id,id(req))));
router.get('/:id/history',async(req,res)=>res.json(await concernHistory(req.user.id,id(req),validate(page,req.query))));
router.get('/:id/messages',async(req,res)=>res.json(await concernMessages(req.user.id,id(req),validate(page,req.query))));
router.get('/:id/eligible-personnel',async(req,res)=>res.json(await eligiblePersonnel(req.user.id,id(req),validate(page.extend({search:z.string().trim().max(200).default('')}),req.query))));
router.post('/:id/referrals',async(req,res)=>res.status(201).json({data:await createReferral(req.user.id,id(req),validate(z.strictObject({updatedAt:revision,referredTo:z.uuid(),reason:text}),req.body))}));
router.post('/:id/messages',async(req,res)=>res.status(201).json({data:await mutateConcern(req.user.id,id(req),'message',validate(z.strictObject({message:text,visibility:z.enum(['student_visible','internal']).default('student_visible')}),req.body))}));
router.post('/:id/assignments',async(req,res)=>res.json({data:await mutateConcern(req.user.id,id(req),'assignment',validate(z.strictObject({updatedAt:revision,assignedTo:z.uuid(),reason:text.optional()}),req.body))}));
router.patch('/:id/status',async(req,res)=>res.json({data:await mutateConcern(req.user.id,id(req),'status',validate(z.strictObject({updatedAt:revision,status:z.enum(statuses),reason:text.optional(),resolutionSummary:text.optional()}),req.body))}));
router.patch('/:id/category',async(req,res)=>res.json({data:await mutateConcern(req.user.id,id(req),'category',validate(z.strictObject({updatedAt:revision,categoryId:z.uuid(),reason:text}),req.body))}));
router.use((error,req,res,next)=>{if(error instanceof multer.MulterError)return res.status(400).json({message:'Use at most 3 attachments, up to 5 MB each, with the allowed form fields.'});next(error);});
router.use(apiError);export default router;
