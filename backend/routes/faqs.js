import { Router, json } from 'express';
import cookieParser from 'cookie-parser';
import { z } from 'zod';
import { pool } from '../config/db.js';
import { requireSession } from '../middleware/session.js';
import { requestGuard, requireAdmin, validate, apiError } from '../middleware/api.js';
import { mutateFaq, faqActions, faqWorkspace, saveFaqWorkspace } from '../services/faqs.js';

const router = Router();
router.use((req,res,next) => /^\/(faqs|admin\/(faqs|audit-logs))(\/|$)/.test(req.path) ? next() : next('router')); 
router.use(requestGuard, cookieParser(), (req,res,next) => json({ limit: req.method === 'PUT' && req.path === '/admin/faqs' ? '20mb' : '64kb' })(req,res,next), requireSession);
const query = z.object({
  page: z.coerce.number().int().min(1).max(1000000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(300).default(''),
  publication: z.enum(['all', 'published', 'draft']).default('all'),
  action: z.enum(['', ...faqActions]).default(''),
  actor: z.string().trim().max(150).default(''),
  from: z.iso.date().optional(), to: z.iso.date().optional(),
});
const content = z.strictObject({ question: z.string().trim().min(1, 'Enter a question.').max(300), answer: z.string().trim().min(1, 'Enter an answer.').max(10000) });
const patch = content.partial().extend({ isPublished: z.boolean().optional() }).refine(x => Object.keys(x).length > 0, 'Provide a change.');
const uuid = z.uuid();
const literalSearch = value => `%${value.replace(/[\\%_]/g, '\\$&')}%`;
async function listFaqs(req, res, admin) {
  const q = validate(query, req.query);
  const values = [literalSearch(q.search)];
  const where = ['(f.question ILIKE $1 OR f.answer ILIKE $1)'];
  if (!admin || q.publication !== 'all') { values.push(!admin || q.publication === 'published'); where.push(`f.is_published=$${values.length}`); }
  const filter = where.join(' AND ');
  const total = Number((await pool.query(`SELECT count(*) FROM public.faqs f WHERE ${filter}`, values)).rows[0].count);
  const fields = admin ? ', f.is_published AS "isPublished", f.created_by AS "createdBy", u.full_name AS "creatorName"' : '';
  const { rows } = await pool.query(`SELECT f.id,f.question,f.answer,f.created_at AS "createdAt",f.updated_at AS "updatedAt" ${fields} FROM public.faqs f LEFT JOIN public.users u ON u.id=f.created_by WHERE ${filter} ORDER BY f.updated_at DESC,f.id DESC LIMIT $${values.length+1} OFFSET $${values.length+2}`, [...values,q.pageSize,(q.page-1)*q.pageSize]);
  res.json({ data: rows, pagination: { page: q.page, pageSize: q.pageSize, total } });
}
function faqResponse(row) {
  return { id: row.id, question: row.question, answer: row.answer, isPublished: row.is_published, createdBy: row.created_by, createdAt: row.created_at, updatedAt: row.updated_at };
}
router.get('/faqs', (req,res) => listFaqs(req,res,false));
router.use('/admin', requireAdmin);
router.get('/admin/faqs/workspace', async (req,res) => {
  const workspace = await faqWorkspace();
  res.json({ data: workspace.rows.map(faqResponse), revision: workspace.revision });
});
router.put('/admin/faqs', async (req,res) => {
  const input = validate(z.strictObject({ revision: z.string().regex(/^[a-f0-9]{64}$/), faqs: z.array(content.extend({id:uuid.optional()})).max(500) }),req.body);
  const saved = await saveFaqWorkspace(req.user,input.revision,input.faqs);
  res.json({ data: saved.rows.map(faqResponse), revision: saved.revision });
});
router.get('/admin/faqs', (req,res) => listFaqs(req,res,true));
router.post('/admin/faqs', async (req,res) => res.status(201).json({ data: faqResponse(await mutateFaq(req.user,null,validate(content,req.body))) }));
router.patch('/admin/faqs/:id', async (req,res) => res.json({ data: faqResponse(await mutateFaq(req.user,validate(uuid,req.params.id),validate(patch,req.body))) }));
router.delete('/admin/faqs/:id', async (req,res) => { await mutateFaq(req.user,validate(uuid,req.params.id),null,true); res.status(204).end(); });
router.get('/admin/audit-logs', async (req,res) => {
  const q = validate(query,req.query);
  if (q.from && q.to && q.from > q.to) throw Object.assign(new Error('The end date must follow the start date.'), {status:400});
  const values = [faqActions]; const conditions = ["a.entity_type='faq'", 'a.action=ANY($1::text[])'];
  function add(sql,value) { values.push(value); conditions.push(sql.replace('?',`$${values.length}`)); }
  if (q.action) add('a.action=?',q.action);
  if (q.actor) add("COALESCE(a.details->'actor'->>'fullName',u.full_name,'') ILIKE ?",literalSearch(q.actor));
  if (q.search) add("(a.action || ' ' || a.details::text) ILIKE ?",literalSearch(q.search));
  if (q.from) add("a.created_at >= (?::date::timestamp AT TIME ZONE 'Asia/Manila')",q.from);
  if (q.to) add("a.created_at < ((?::date + 1)::timestamp AT TIME ZONE 'Asia/Manila')",q.to);
  const filter=conditions.join(' AND ');
  const total=Number((await pool.query(`SELECT count(*) FROM public.audit_logs a LEFT JOIN public.users u ON u.id=a.actor_user_id WHERE ${filter}`,values)).rows[0].count);
  const {rows}=await pool.query(`SELECT a.id,a.action,a.entity_id AS "entityId",a.actor_user_id AS "actorId",COALESCE(a.details->'actor'->>'fullName',u.full_name,'Deleted account') AS "actorName",a.details,a.created_at AS "createdAt" FROM public.audit_logs a LEFT JOIN public.users u ON u.id=a.actor_user_id WHERE ${filter} ORDER BY a.created_at DESC,a.id DESC LIMIT $${values.length+1} OFFSET $${values.length+2}`,[...values,q.pageSize,(q.page-1)*q.pageSize]);
  res.json({data:rows,pagination:{page:q.page,pageSize:q.pageSize,total}});
});
router.use(apiError);
export default router;
