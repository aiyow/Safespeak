import { Router,json } from 'express';
import cookieParser from 'cookie-parser';
import { z } from 'zod';
import { pool } from '../config/db.js';
import { requireSession } from '../middleware/session.js';
import { requestGuard,requireAdmin,validate,apiError } from '../middleware/api.js';
import { saveCategory,deleteCategory,categoryFields } from '../services/categories.js';
const router=Router();
router.use(requestGuard,cookieParser(),json({limit:'16kb'}),requireSession,requireAdmin);
const fields=z.strictObject({name:z.string().trim().min(1,'Enter a category name.').max(100),description:z.string().trim().max(2000).default(''),isActive:z.boolean().default(true)});
router.get('/',async(req,res)=>{
 const q=validate(z.object({search:z.string().trim().max(200).default(''),status:z.enum(['all','active','inactive']).default('all')}),req.query);
 const params=[`%${q.search.replace(/[\\%_]/g,'\\$&')}%`];let filter='(c.name ILIKE $1 OR c.description ILIKE $1)';
 if(q.status!=='all'){params.push(q.status==='active');filter+=' AND c.is_active=$2';}
 const {rows}=await pool.query(`SELECT ${categoryFields},(SELECT count(*)::int FROM public.concerns x WHERE x.category_id=c.id) AS "concernCount" FROM public.concern_categories c WHERE ${filter} ORDER BY c.sort_order,c.created_at,c.id`,params);res.json({data:rows});
});
router.post('/',async(req,res)=>res.status(201).json({data:await saveCategory(req.user,null,validate(fields,req.body))}));
router.patch('/:id',async(req,res)=>res.json({data:await saveCategory(req.user,validate(z.uuid(),req.params.id),validate(z.strictObject({name:fields.shape.name.optional(),description:z.string().trim().max(2000).optional(),isActive:z.boolean().optional(),updatedAt:z.string().min(1).max(60)}),req.body))}));
router.delete('/:id',async(req,res)=>{const input=validate(z.strictObject({updatedAt:z.string().min(1).max(60)}),req.body);await deleteCategory(req.user,validate(z.uuid(),req.params.id),input.updatedAt);res.status(204).end();});
router.use(apiError);export default router;
