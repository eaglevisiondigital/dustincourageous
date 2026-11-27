import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
type Child = {id:string;display_name:string};
type Book = {id:string;title:string;book_number:number|null;status:string};
type Access = {book:Book;companion:boolean};
export function FamilyAccessOverview({householdId,children,onOpenBooks,onOpenActivities}:{
  householdId:string;children:Child[];
  onOpenBooks:(childId:string)=>void;onOpenActivities:(childId:string)=>void;
}){
  const [books,setBooks]=useState<Access[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const version=useRef(0);
  const load=useCallback(async()=>{
    const current=++version.current;
    setLoading(true);setError("");
    try{
      const {data,error:readError}=await supabase.from("books")
        .select("id,title,book_number,status")
        .in("status",["coming_soon","published"])
        .order("book_number",{ascending:true}).limit(20);
      if(readError)throw readError;
      const available=(data??[]) as Book[];
      const checks=await Promise.all(available.map(book=>supabase.rpc("has_book_access",{p_book_id:book.id})));
      if(current!==version.current)return;
      if(checks.some(result=>result.error||typeof result.data!=="boolean"))throw new Error("Access unavailable");
      setBooks(available.map((book,i)=>({book,companion:checks[i].data===true})));
    }catch{
      if(current===version.current){setBooks([]);setError("Book access could not be checked. Please retry.");}
    }finally{if(current===version.current)setLoading(false);}
  },[householdId]);
  useEffect(()=>{void load();return()=>{version.current+=1;}},[load]);
  return <section className="dc-family-access" aria-label="Your family's book and activity access">
    <div className="dc-family-access-heading">
      <div><p className="eyebrow gold">Your Family's Access</p>
      <h2>What your adventurers can explore</h2>
      <p>Books and membership benefits belong to your household. Each child keeps separate activity progress, reading position, XP and badges.</p></div>
      <span aria-hidden="true" className="dc-family-access-shield">🛡️</span>
    </div>
    {loading?<p role="status">Checking household book access…</p>
      :error?<div role="alert">{error} <button className="secondary-button" onClick={()=>void load()}>Retry</button></div>
      :<div className="dc-family-books-grid">
        {books.length?books.map(({book,companion})=><article className="dc-family-book" key={book.id}>
          <p className="eyebrow red">BOOK {book.book_number??""}</p>
          <h3>{book.title}</h3>
          <p className={companion?"dc-access-available":"dc-access-locked"}>{companion?"Book Companion Available":"Book Companion Locked"}</p>
          <small>Full digital-book pages require separate publication and access checks.</small>
        </article>):<p>No published or upcoming books are listed yet.</p>}
      </div>}
    <div className="dc-family-access-kids">
      {children.map(child=><div className="dc-family-access-kid" key={child.id}>
        <span className="dc-family-avatar">{child.display_name.slice(0,1).toUpperCase()}</span><strong>{child.display_name}</strong>
        <button type="button" onClick={()=>onOpenBooks(child.id)}>My Books</button>
        <button type="button" onClick={()=>onOpenActivities(child.id)}>Activities</button>
      </div>)}
    </div>
    <p className="dc-family-access-note">Family progress shows each child's completed steps. Reading, practice, and challenge completions have different requirements; only verified completions award XP or unlock rewards.</p>
  </section>;
}
