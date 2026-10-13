import { z } from "zod";
import { getDatabase, type AcademyDatabase } from "@/modules/storage/db";
import type { JsonValue } from "@/modules/storage/types";

const amount=z.number().finite().nonnegative().max(1e12);
const price=amount.positive();
const note=z.string().trim().max(3000);
export const journalSchema=z.object({
  openedAt:z.string().datetime(),closedAt:z.string().datetime(),pair:z.string().regex(/^[A-Z]{3}\/[A-Z]{3}$/),direction:z.enum(["buy","sell"]),
  entry:price,exit:price,stop:price,target:price,units:price,quoteToAccount:price,costs:amount,
  strategy:z.string().trim().min(1).max(100),entryReason:note,exitReason:note,emotionBefore:note,emotionAfter:note,errors:z.array(z.string().max(100)).max(10),notes:note,followedPlan:z.boolean(),
  image:z.string().max(500000).regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/).optional(),
}).strict().superRefine((entry,ctx)=>{
  if(entry.closedAt<entry.openedAt)ctx.addIssue({code:"custom",message:"La salida debe ser posterior a la entrada.",path:["closedAt"]});
  if(entry.direction==="buy" ? entry.stop>=entry.entry || entry.target<=entry.entry : entry.stop<=entry.entry || entry.target>=entry.entry)ctx.addIssue({code:"custom",message:"El stop y el objetivo deben corresponder a la dirección y entrada originales.",path:["stop"]});
});
export type JournalEntry=z.infer<typeof journalSchema>;
export type SavedJournalEntry=JournalEntry & {id:string;createdAt:string;updatedAt:string};
export function tradeResult(entry:JournalEntry) {const sign=entry.direction==="buy" ? 1 : -1;const gross=(entry.exit-entry.entry)*sign*entry.units*entry.quoteToAccount;const net=gross-entry.costs;const risk=Math.abs(entry.entry-entry.stop)*entry.units*entry.quoteToAccount+entry.costs;return {gross,net,risk,r:net/risk};}
export async function saveJournalEntry(value:unknown,id?:string,client:AcademyDatabase=getDatabase()):Promise<SavedJournalEntry> {
  const parsed=journalSchema.safeParse(value);if(!parsed.success)throw new Error(parsed.error.issues.map(issue=>issue.message).join(" "));
  const existing=id ? await client.journalEntries.get(id) : undefined;if(id&&!existing)throw new Error("Esta entrada ya no existe. Recarga el diario.");
  const now=new Date().toISOString();const saved={id:id??crypto.randomUUID(),createdAt:existing?.createdAt??now,updatedAt:now,metadata:JSON.parse(JSON.stringify(parsed.data)) as Record<string,JsonValue>};await client.journalEntries.put(saved);return {...parsed.data,id:saved.id,createdAt:saved.createdAt,updatedAt:now};
}
export async function getJournalEntries(client:AcademyDatabase=getDatabase()):Promise<SavedJournalEntry[]> {
  return (await client.journalEntries.toArray()).map(record=>{const parsed=journalSchema.safeParse(record.metadata);if(!parsed.success)throw new Error("Hay una entrada de diario incompatible. Conserva una copia JSON antes de revisar sus datos.");return {...parsed.data,id:record.id,createdAt:record.createdAt,updatedAt:record.updatedAt};}).sort((a,b)=>b.closedAt.localeCompare(a.closedAt));
}
export function journalAnalytics(entries:JournalEntry[]) {
  const results=entries.map(tradeResult);const positive=results.reduce((sum,item)=>sum+Math.max(0,item.net),0);const negative=-results.reduce((sum,item)=>sum+Math.min(0,item.net),0);
  const groups=new Map<string,{count:number;net:number;r:number;followed:number}>();const hours=new Map<string,{count:number;net:number}>();const errors=new Map<string,number>();
  entries.forEach((entry,index)=>{const group=groups.get(entry.strategy)??{count:0,net:0,r:0,followed:0};group.count++;group.net+=results[index].net;group.r+=results[index].r;group.followed+=Number(entry.followedPlan);groups.set(entry.strategy,group);const hour=new Date(entry.openedAt).getUTCHours().toString().padStart(2,"0")+":00 UTC";const slot=hours.get(hour)??{count:0,net:0};slot.count++;slot.net+=results[index].net;hours.set(hour,slot);for(const error of entry.errors)errors.set(error,(errors.get(error)??0)+1);});
  return {count:entries.length,net:positive-negative,expectancyR:entries.length ? results.reduce((sum,item)=>sum+item.r,0)/entries.length : null,profitFactor:negative===0 ? null : positive/negative,discipline:entries.length ? entries.filter(entry=>entry.followedPlan).length/entries.length*100 : null,groups:[...groups].map(([name,value])=>({name,...value})),hours:[...hours].map(([hour,value])=>({hour,...value})).sort((a,b)=>a.net/a.count-b.net/b.count),errors:[...errors].map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count)};
}
