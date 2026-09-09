import {DurableObject} from 'cloudflare:workers';
import {boundedBody,digest,seal,unseal,response,serviceJSON,validateEvidence,transition,persistReceipt,MAX_ATTEMPTS} from './core.mjs';

export default {
  async fetch(request,env) {
    const path=new URL(request.url).pathname;
    if(path.includes('refund')) return response(403,'refund_initiation_disabled');
    if(path!=='/webhooks/oen') return response(404,'not_found');
    if(request.method!=='POST') return response(405,'method_not_allowed');
    // Owner must pin the actual provider ACK/content-type contract before enabling.
    if(env.INGRESS_PROFILE!=='oen-reviewed-v1'||![env.PROVIDER_ENVIRONMENT,env.MERCHANT_ALIAS,env.INBOX_KEY_ID].every(v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(v)&&v!=='unconfirmed')) return response(503,'not_configured');
    try {
      const limit=await env.INGRESS_LIMITER.limit({key:request.headers.get('cf-connecting-ip')||'unknown'});
      if(!limit.success) return response(429,'rate_limited');
    } catch {return response(503,'limiter_unavailable');}
    if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')||'')) return response(415,'unsupported_type');
    let bytes;
    try {bytes=await boundedBody(request);JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}
    catch {return response(400,'invalid_body');}
    try {
      const scope=env.PROVIDER_ENVIRONMENT+':'+env.MERCHANT_ALIAS+':';
      const receiptId=await digest(new Uint8Array([...new TextEncoder().encode(scope),...bytes]));
      const sealed=await seal(bytes,env.INBOX_KEY,receiptId);
      const receipt=env.RECEIPTS.get(env.RECEIPTS.idFromName(receiptId));
      await receipt.accept({receiptId,keyId:env.INBOX_KEY_ID,...sealed});
      // Durable receipt + durable recovery alarm completed; no claim about payment validity.
      return response(200,'ok');
    } catch {return response(503,'receipt_unavailable');}
  }
};

export class PaymentReceipt extends DurableObject {
  // Private namespace RPC only. No HTTP/admin route is exported.
  async retryHeld() {
    await this.ctx.storage.transaction(async tx=>{
      const r=await tx.get('receipt');
      if(!r||r.state!=='held') throw new Error('not_held');
      await tx.put('receipt',{...r,state:'pending',attempts:0,recoveryCount:(r.recoveryCount||0)+1,recoveredAt:Date.now()});
      await tx.setAlarm(Date.now()+1000);
    });
  }
  async accept(envelope) {
    await persistReceipt(this.ctx.storage,envelope);
  }
  async alarm() {
    const record=await this.ctx.storage.transaction(async tx=>{
      const r=await tx.get('receipt');
      if(!r||r.state!=='pending') return null;
      r.attempts++;
      // Arm recovery before network; a process crash cannot lose the retry.
      await tx.put('receipt',r);
      await tx.setAlarm(Date.now()+Math.min(3600000,30000*2**Math.min(r.attempts,7)));
      return r;
    });
    if(!record) return;
    try {
      const secret=record.keyId===this.env.INBOX_KEY_ID?this.env.INBOX_KEY:record.keyId===this.env.INBOX_PREVIOUS_KEY_ID?this.env.INBOX_PREVIOUS_KEY:null;
      const bytes=await unseal(record,secret,record.receiptId);
      const callback=JSON.parse(new TextDecoder().decode(bytes));
      const evidence=await serviceJSON(this.env.VERIFIER,'verify',{contract:'mingge-untrusted-receipt-v1',receiptId:record.receiptId,callback});
      // Validate structure before the owning-store lookup (not a URL from callback).
      if(typeof evidence?.orderId!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(evidence.orderId)) throw new Error('verification_required');
      const order=await serviceJSON(this.env.ORDER_STORE,'order',{orderId:evidence.orderId});
      const event=validateEvidence(evidence,order,this.env);
      const orderKey=await digest(new TextEncoder().encode(event.environment+':'+event.merchant+':'+event.orderId));
      await this.env.ORDERS.get(this.env.ORDERS.idFromName(orderKey)).accept(event);
      await this.ctx.storage.transaction(async tx=>{
        await tx.put('receipt',{...record,state:'verified_queued',completedAt:Date.now()});
        await tx.deleteAlarm();
      });
    } catch {
      if(record.attempts>=MAX_ATTEMPTS) await this.ctx.storage.transaction(async tx=>{
        await tx.put('receipt',{...record,state:'held',failureCode:'verification_or_queue_failed'});
        await tx.deleteAlarm();
      });
    }
  }
}

export class PaymentOrder extends DurableObject {
  async retryHeld() {
    await this.ctx.storage.transaction(async tx=>{
      const queue=await tx.get('outbox');
      if(queue?.[0]?.state!=='held') throw new Error('not_held');
      queue[0]={...queue[0],state:'pending',attempts:0,recoveryCount:(queue[0].recoveryCount||0)+1,recoveredAt:Date.now()};
      await tx.put('outbox',queue);await tx.setAlarm(Date.now()+1000);
    });
  }
  async accept(event) {
    event={...event,applicationId:await digest(new TextEncoder().encode([event.environment,event.merchant,event.orderId,event.state].join(':')))};
    await this.ctx.storage.transaction(async tx=>{
      const previous=await tx.get('current');
      const action=transition(previous,event);
      if(action==='metadata') {await tx.put('current',event);return;}
      if(action!=='apply') return;
      const queue=(await tx.get('outbox'))||[];
      if(queue.length>=100) throw new Error('outbox_full');
      queue.push({event,attempts:0,state:'pending'});
      await tx.put('current',event);
      await tx.put('outbox',queue);
      await tx.setAlarm(Date.now()+1000);
    });
  }
  async alarm() {
    const item=await this.ctx.storage.transaction(async tx=>{
      const queue=(await tx.get('outbox'))||[];
      if(!queue.length||queue[0].state!=='pending') return null;
      queue[0].attempts++;
      await tx.put('outbox',queue);
      await tx.setAlarm(Date.now()+Math.min(3600000,30000*2**Math.min(queue[0].attempts,7)));
      return queue[0];
    });
    if(!item) return;
    try {
      const ack=await serviceJSON(this.env.CONSUMER,'apply',{contract:'mingge-payment-v1',...item.event});
      if(ack?.contract!=='mingge-payment-v1'||ack.eventId!==item.event.eventId||ack.applicationId!==item.event.applicationId||ack.applied!==true) throw new Error('application_ack_required');
      await this.ctx.storage.transaction(async tx=>{
        const queue=await tx.get('outbox');
        // Another accept may append while downstream is in flight; never overwrite it.
        if(queue[0]?.event.eventId!==item.event.eventId) throw new Error('queue_conflict');
        queue.shift(); await tx.put('outbox',queue);
        await tx.put('lastDelivered',{eventId:item.event.eventId,at:Date.now()});
        if(queue.length) await tx.setAlarm(Date.now()+1000); else await tx.deleteAlarm();
      });
    } catch {
      if(item.attempts>=MAX_ATTEMPTS) await this.ctx.storage.transaction(async tx=>{
        const queue=await tx.get('outbox');
        if(queue[0]?.event.eventId===item.event.eventId) queue[0].state='held';
        await tx.put('outbox',queue); await tx.deleteAlarm();
      });
    }
  }
}
