import { Router,json } from 'express';
import cookieParser from 'cookie-parser';
import { z } from 'zod';
import { pool } from '../config/db.js';
import { requireSession } from '../middleware/session.js';
import { requestGuard,requireAdmin,validate,apiError } from '../middleware/api.js';
import { saveUser } from '../services/users.js';
import { effectiveAccess,getUser,userFields } from '../services/user-access.js';
const router=Router();
router.use((req,res,next)=>/^\/(admin\/users|access\/me)(\/|$)/.test(req.path)?next():next('router'));
router.use(requestGuard,cookieParser(),json({limit:'32kb'}),requireSession);
const email=z.string().trim().toLowerCase().pipe(z.email().max(255));
const scope=z.array(z.uuid()).max(1000).refine(ids=>new Set(ids).size===ids.length,'Duplicate categories are not allowed.');
const role=z.enum(['student','personnel','admin']);
const fields={email,role,isIntakeCoordinator:z.boolean().optional(),isActive:z.boolean(),categoryIds:scope,
 course:z.enum(['BSIT','BSCS']).nullable(),studentNumber:z.string().trim().toUpperCase().regex(/^\d{3}-\d{5}[A-Z]$/,'Use the format 234-12345M.').nullable(),
 yearLevel:z.number().int().min(1).max(4).nullable(),section:z.string().trim().min(1).max(30).nullable()};
const creation=z.strictObject({...fields,isActive:z.boolean().default(true),categoryIds:scope.default([]),course:fields.course.optional(),studentNumber:fields.studentNumber.optional(),yearLevel:fields.yearLevel.optional(),section:fields.section.optional(),firstName:z.string().trim().min(1).max(70),lastName:z.string().trim().min(1).max(70),middleInitial:z.string().trim().regex(/^(?:\p{L}\.?)?$/u).default('').transform(value=>value.replace(/\.$/,'')),password:z.string().refine(value=>[...value].length>=12&&Buffer.byteLength(value,'utf8')<=72,'Use a password of at least 12 characters and at most 72 UTF-8 bytes.')});
const edit=z.strictObject({...fields,fullName:z.string().trim().min(1).max(150)}).partial().extend({updatedAt:z.string().min(1).max(60)});
router.get('/access/me',async(req,res)=>res.json({data:await effectiveAccess(req.user.id)}));
router.use('/admin',requireAdmin);
router.get('/admin/users/summary',async(req,res)=>{
 const {rows:[row]}=await pool.query("SELECT count(*) FILTER(WHERE is_active)::int AS accounts,count(*) FILTER(WHERE is_active AND role='personnel')::int AS personnel FROM public.users");res.json({data:row});
});
router.get('/admin/users',async(req,res)=>{
 const q=validate(z.object({search:z.string().trim().max(300).default(''),role:z.enum(['all','student','personnel','admin']).default('all'),status:z.enum(['all','active','inactive']).default('all'),page:z.coerce.number().int().min(1).max(1000000).default(1),pageSize:z.coerce.number().int().min(1).max(100).default(20)}),req.query);
 const values=[`%${q.search.replace(/[\\%_]/g,'\\$&')}%`];const where=['(u.full_name ILIKE $1 OR u.email ILIKE $1 OR u.student_number ILIKE $1)'];
 if(q.role!=='all'){values.push(q.role);where.push(`u.role=$${values.length}`);}
 if(q.status!=='all'){values.push(q.status==='active');where.push(`u.is_active=$${values.length}`);}
 const filter=where.join(' AND ');
 const total=Number((await pool.query(`SELECT count(*) FROM public.users u WHERE ${filter}`,values)).rows[0].count);
 const {rows}=await pool.query(`SELECT ${userFields},COALESCE((SELECT json_agg(json_build_object('id',c.id,'name',c.name,'isActive',c.is_active) ORDER BY c.name) FROM public.personnel_category_access p JOIN public.concern_categories c ON c.id=p.category_id WHERE p.user_id=u.id),'[]') AS categories FROM public.users u WHERE ${filter} ORDER BY u.created_at DESC,u.id DESC LIMIT $${values.length+1} OFFSET $${values.length+2}`,[...values,q.pageSize,(q.page-1)*q.pageSize]);
 res.json({data:rows,pagination:{page:q.page,pageSize:q.pageSize,total}});
});
router.get('/admin/users/:id',async(req,res)=>{const user=await getUser(pool,validate(z.uuid(),req.params.id));if(!user)return res.status(404).json({message:'User not found.'});res.json({data:user});});
router.post('/admin/users',async(req,res)=>res.status(201).json({data:await saveUser(req.user,null,validate(creation,req.body))}));
router.patch('/admin/users/:id',async(req,res)=>res.json({data:await saveUser(req.user,validate(z.uuid(),req.params.id),validate(edit,req.body))}));
router.use(apiError);
export default router;
