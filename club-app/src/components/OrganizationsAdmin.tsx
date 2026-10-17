import { FormEvent, useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Organization = {
  id: string;
  organization_key: string;
  name: string;
  organization_type: string;
  status: string;
  created_at: string;
};

function slugify(value:string){
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
}

export function OrganizationsAdmin(){
  const [items,setItems]=useState<Organization[]>([]);
  const [name,setName]=useState("");
  const [key,setKey]=useState("");
  const [type,setType]=useState("church");
  const [working,setWorking]=useState(false);
  const [message,setMessage]=useState("");

  const load=useCallback(async()=>{
    const {data,error}=await supabase
      .from("organizations")
      .select("id,organization_key,name,organization_type,status,created_at")
      .order("created_at",{ascending:false});
    if(error){setMessage(error.message);return;}
    setItems((data??[]) as Organization[]);
  },[]);

  useEffect(()=>{void load();},[load]);

  async function submit(event:FormEvent){
    event.preventDefault();
    setWorking(true);setMessage("");
    const {error}=await supabase.rpc("admin_create_organization",{
      p_organization_key:key||slugify(name),
      p_name:name.trim(),
      p_organization_type:type
    });
    setWorking(false);
    if(error){setMessage(error.message);return;}
    setName("");setKey("");
    setMessage("Organization created. You are its initial owner for Alpha setup.");
    await load();
  }

  return (
    <div className="admin-two-column">
      <section className="admin-card">
        <p className="eyebrow red">Approved Organizations</p>
        <h2>Create organization</h2>
        <form className="admin-form" onSubmit={submit}>
          <label>
            Name
            <input required value={name} onChange={(event)=>{setName(event.target.value);if(!key)setKey(slugify(event.target.value));}}/>
          </label>
          <label>
            Key
            <input required value={key} onChange={(event)=>setKey(slugify(event.target.value))}/>
          </label>
          <label className="full">
            Type
            <select value={type} onChange={(event)=>setType(event.target.value)}>
              <option value="church">Church</option>
              <option value="school">School</option>
              <option value="homeschool">Homeschool co-op</option>
              <option value="ministry">Ministry</option>
              <option value="community">Community</option>
              <option value="other">Other</option>
            </select>
          </label>
          <button className="primary-button full" disabled={working}>Create approved organization</button>
        </form>
        {message&&<div className="form-message" style={{marginTop:14}}>{message}</div>}
      </section>

      <section className="admin-card">
        <div className="section-heading compact-heading">
          <div><p className="eyebrow gold">Organizations</p><h2>Adventure Club partners</h2></div>
          <span className="pill">{items.length}</span>
        </div>
        <div className="admin-list">
          {items.map((item)=>(
            <article className="admin-list-row" key={item.id}>
              <div>
                <strong>{item.name}</strong>
                <small>{item.organization_type.replaceAll("_"," ")} · {item.organization_key}</small>
              </div>
              <span className={item.status==="active"?"status-chip done":"status-chip"}>{item.status}</span>
            </article>
          ))}
          {!items.length&&<p className="muted">No organizations yet.</p>}
        </div>
      </section>
    </div>
  );
}
