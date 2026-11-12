import { pool } from '../config/db.js';
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
async function reportRead(userId,work) {
 const client=await pool.connect();
 try{
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const actor=(await client.query('SELECT role,is_active FROM public.users WHERE id=$1',[userId])).rows[0];
  if(!actor?.is_active||actor.role!=='admin')throw fail('Administrator access is required.',403);
  const result=await work(client);await client.query('COMMIT');return result;
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
export function reportSummary(userId) {return reportRead(userId,async client=>({data:{total:Number((await client.query('SELECT count(*) FROM public.concerns')).rows[0].count)}}));}
export function reportOptions(userId) {
 return reportRead(userId,async client=>({data:{categories:(await client.query('SELECT id,name FROM public.concern_categories ORDER BY sort_order,created_at,id')).rows,personnel:(await client.query("SELECT u.id,u.full_name AS name FROM public.users u WHERE u.role='personnel' OR EXISTS(SELECT 1 FROM public.concern_assignments a WHERE a.assigned_to=u.id AND a.ended_at IS NULL) ORDER BY u.full_name,u.id")).rows}}));
}
export function getReports(userId,q) {
 return reportRead(userId,async client=>{
  const values=[],where=['true'];
  const add=(sql,value)=>{values.push(value);where.push(sql.replace('?',`$${values.length}`));};
  if(q.from)add("c.created_at >= (?::date::timestamp AT TIME ZONE 'Asia/Manila')",q.from);
  if(q.to)add("c.created_at < ((?::date+1)::timestamp AT TIME ZONE 'Asia/Manila')",q.to);
  if(q.status)add('c.status=?',q.status);
  if(q.categoryId)add('c.category_id=?',q.categoryId);
  if(q.personnelId)add('a.assigned_to=?',q.personnelId);
  const source=`WITH filtered AS (SELECT c.status,c.category_id,a.assigned_to,(c.created_at AT TIME ZONE 'Asia/Manila')::date AS day FROM public.concerns c LEFT JOIN public.concern_assignments a ON a.concern_id=c.id AND a.ended_at IS NULL WHERE ${where.join(' AND ')})`;
  const summary=(await client.query(`${source} SELECT count(*)::int AS total,count(*) FILTER(WHERE status IN ('submitted','under_review'))::int AS "awaitingReview",count(*) FILTER(WHERE status IN ('assigned','in_progress'))::int AS "inProgress",count(*) FILTER(WHERE status IN ('resolved','closed'))::int AS resolved,count(*) FILTER(WHERE status='rejected')::int AS rejected FROM filtered`,values)).rows[0];
  const byStatus=(await client.query(`${source} SELECT status,count(*)::int AS count FROM filtered GROUP BY status ORDER BY status`,values)).rows;
  async function group(sql,order,page) {
   const total=Number((await client.query(`${source} SELECT count(*) FROM (${sql}) grouped`,values)).rows[0].count);
   const data=(await client.query(`${source} ${sql} ORDER BY ${order} LIMIT $${values.length+1} OFFSET $${values.length+2}`,[...values,q.pageSize,(page-1)*q.pageSize])).rows;
   return {data,pagination:{total,page,pageSize:q.pageSize}};
  }
  const byCategory=await group('SELECT c.id,c.name,count(*)::int AS count FROM filtered f JOIN public.concern_categories c ON c.id=f.category_id GROUP BY c.id,c.name','count DESC,name,id',q.categoryPage);
  const byPersonnel=await group("SELECT u.id,u.full_name AS name,count(*)::int AS count FROM filtered f LEFT JOIN public.users u ON u.id=f.assigned_to GROUP BY u.id,u.full_name",'count DESC,name NULLS LAST,id',q.personnelPage);
  const byDate=await group("SELECT to_char(day,'YYYY-MM-DD') AS date,count(*)::int AS count FROM filtered GROUP BY day",'date DESC',q.datePage);
  return {data:{summary,byStatus,byCategory,byPersonnel,byDate}};
 });
}
