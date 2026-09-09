// Local Miniflare only. Not referenced by Wrangler or any deployed entry point.
import ingress,{PaymentReceipt,PaymentOrder} from '../worker.mjs';
import {persistReceipt} from '../core.mjs';
export class TestReceipt extends PaymentReceipt {
  async accept(e){
    if(this.env.FAIL_RECEIPT) throw new Error('synthetic disk unavailable');
    if(this.env.FAIL_ALARM) return persistReceipt({transaction:fn=>this.ctx.storage.transaction(tx=>fn({get:tx.get.bind(tx),put:tx.put.bind(tx),setAlarm:()=>{throw new Error('synthetic alarm write failure');}}))},e);
    return super.accept(e);
  }
  async inspect(){return (await this.ctx.storage.get('receipt'))||null;}
  async run(){await this.alarm();}
}
export class TestOrder extends PaymentOrder {
  async inspect(){return {current:await this.ctx.storage.get('current'),queue:await this.ctx.storage.get('outbox'),alarm:await this.ctx.storage.getAlarm()};}
  async run(){await this.alarm();}
}
export default {
 async fetch(req,env){
   if(new URL(req.url).pathname==='/__test') {
     const {kind,name,operation,event}=await req.json();
     const ns=kind==='receipt'?env.RECEIPTS:env.ORDERS;
     const stub=ns.get(ns.idFromName(name));
     if(operation==='run') await stub.run();
     if(operation==='retry') await stub.retryHeld();
     if(operation==='accept') await stub.accept(event);
     return Response.json(await stub.inspect());
   }
   return ingress.fetch(req,{...env,INGRESS_LIMITER:{limit:async()=>({success:true})}});
 }
};
