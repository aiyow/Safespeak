import { createHash } from 'node:crypto';
import { pool } from '../config/db.js';
export const faqActions = ['faq.created', 'faq.updated', 'faq.published', 'faq.unpublished', 'faq.deleted'];
const snapshot = row => row ? { question: row.question, answer: row.answer, isPublished: row.is_published } : null;
export async function mutateFaq(actor, id, input, remove = false) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('LOCK TABLE public.faqs IN SHARE ROW EXCLUSIVE MODE');
    let before = null;
    if (id) {
      before = (await client.query('SELECT * FROM public.faqs WHERE id=$1 FOR UPDATE', [id])).rows[0];
      if (!before) throw Object.assign(new Error('FAQ not found.'), { status: 404 });
    }
    let after;
    const actions = [];
    if (remove) {
      await client.query('DELETE FROM public.faqs WHERE id=$1', [id]);
      after = null;
      actions.push('faq.deleted');
    } else if (!id) {
      after = (await client.query('INSERT INTO public.faqs(question,answer,is_published,created_by) VALUES($1,$2,false,$3) RETURNING *', [input.question, input.answer, actor.id])).rows[0];
      actions.push('faq.created');
    } else {
      const next = { question: input.question ?? before.question, answer: input.answer ?? before.answer, isPublished: input.isPublished ?? before.is_published };
      if (next.question !== before.question || next.answer !== before.answer) actions.push('faq.updated');
      if (next.isPublished !== before.is_published) actions.push(next.isPublished ? 'faq.published' : 'faq.unpublished');
      after = actions.length ? (await client.query('UPDATE public.faqs SET question=$2,answer=$3,is_published=$4,updated_at=now() WHERE id=$1 RETURNING *', [id, next.question, next.answer, next.isPublished])).rows[0] : before;
    }
    for (const action of actions) {
      await client.query('INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,details) VALUES($1,$2,$3,$4,$5)', [actor.id, action, 'faq', id || after.id, { actor: { fullName: actor.fullName, role: actor.role }, before: snapshot(before), after: snapshot(after) }]);
    }
    await client.query('COMMIT');
    return after;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

function collectionRevision(rows) {
  return createHash('sha256').update(JSON.stringify(rows.map(row => [row.id, row.question, row.answer, row.is_published, row.updated_at]))).digest('hex');
}
export async function faqWorkspace() {
  const { rows } = await pool.query('SELECT * FROM public.faqs ORDER BY id');
  return { rows, revision: collectionRevision(rows) };
}
export async function saveFaqWorkspace(actor, revision, entries) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('LOCK TABLE public.faqs IN SHARE ROW EXCLUSIVE MODE');
    const { rows } = await client.query('SELECT * FROM public.faqs ORDER BY id');
    if (collectionRevision(rows) !== revision) throw Object.assign(new Error('FAQs changed since you opened this page. Reload the saved FAQs before applying your changes.'), { status: 409 });
    const existing = new Map(rows.map(row => [row.id, row]));
    const retained = new Set();
    const log = async (action, before, after) => client.query('INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,details) VALUES($1,$2,$3,$4,$5)', [actor.id, action, 'faq', before?.id || after.id, { actor: { fullName: actor.fullName, role: actor.role }, before: snapshot(before), after: snapshot(after) }]);
    for (const entry of entries) {
      if (!entry.id) {
        const after = (await client.query('INSERT INTO public.faqs(question,answer,is_published,created_by) VALUES($1,$2,true,$3) RETURNING *', [entry.question,entry.answer,actor.id])).rows[0];
        await log('faq.created',null,after);
        await log('faq.published',null,after);
        continue;
      }
      const before = existing.get(entry.id);
      if (!before || retained.has(entry.id)) throw Object.assign(new Error('The FAQ collection contains an invalid or repeated ID.'), {status:400});
      retained.add(entry.id);
      const edited = before.question !== entry.question || before.answer !== entry.answer;
      if (edited || !before.is_published) {
        const after = (await client.query('UPDATE public.faqs SET question=$2,answer=$3,is_published=true,updated_at=now() WHERE id=$1 RETURNING *',[entry.id,entry.question,entry.answer])).rows[0];
        if (edited) await log('faq.updated',before,after);
        if (!before.is_published) await log('faq.published',before,after);
      }
    }
    for (const before of rows) {
      if (!retained.has(before.id)) {
        await client.query('DELETE FROM public.faqs WHERE id=$1',[before.id]);
        await log('faq.deleted',before,null);
      }
    }
    const saved = (await client.query('SELECT * FROM public.faqs ORDER BY id')).rows;
    await client.query('COMMIT');
    return { rows: saved, revision: collectionRevision(saved) };
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
