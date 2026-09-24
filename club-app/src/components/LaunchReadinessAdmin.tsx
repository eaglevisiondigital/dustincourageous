import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type LaunchCheck = {
  area: string;
  check_key: string;
  title: string;
  severity: string;
  passed: boolean;
  detail: string;
};

export function LaunchReadinessAdmin() {
  const [checks,setChecks]=useState<LaunchCheck[]>([]);
  const [message,setMessage]=useState("");

  const load=useCallback(async()=>{
    setMessage("");
    const {data,error}=await supabase.rpc("admin_get_production_launch_gate");
    if(error){
      setMessage(error.message);
      return;
    }
    setChecks((data??[]) as LaunchCheck[]);
  },[]);

  useEffect(()=>{void load();},[load]);

  const blockers=useMemo(
    ()=>checks.filter((item)=>item.severity==="blocker"&&!item.passed),
    [checks]
  );
  const warnings=useMemo(
    ()=>checks.filter((item)=>item.severity==="warning"&&!item.passed),
    [checks]
  );
  const passed=useMemo(
    ()=>checks.filter((item)=>item.passed),
    [checks]
  );

  const grouped=useMemo(()=>{
    const map=new Map<string,LaunchCheck[]>();
    for(const check of checks){
      const existing=map.get(check.area)??[];
      existing.push(check);
      map.set(check.area,existing);
    }
    return Array.from(map.entries());
  },[checks]);

  return (
    <div className="launch-gate-admin">
      {message&&<div className="form-message">{message}</div>}

      <section className={blockers.length===0?"launch-gate-hero ready":"launch-gate-hero blocked"}>
        <div>
          <p className="eyebrow gold">Production Readiness</p>
          <h2>{blockers.length===0?"Launch blockers cleared":"Not ready for production launch"}</h2>
          <p>
            This gate checks DC Governance, theology/prayer compliance, guardian safety, privacy operations,
            communications delivery, scheduled workers, commerce, and stale operational failures.
          </p>
        </div>
        <div className="launch-gate-score">
          <strong>{passed.length}/{checks.length}</strong>
          <span>checks passing</span>
        </div>
      </section>

      <div className="launch-gate-summary">
        <article className={blockers.length?"bad":"good"}>
          <span>Blockers</span>
          <strong>{blockers.length}</strong>
          <small>{blockers.length?"Must be cleared before production":"Clear"}</small>
        </article>
        <article className={warnings.length?"warn":"good"}>
          <span>Warnings</span>
          <strong>{warnings.length}</strong>
          <small>{warnings.length?"Recommended before launch":"Clear"}</small>
        </article>
        <article className="good">
          <span>Passing</span>
          <strong>{passed.length}</strong>
          <small>Current checks</small>
        </article>
      </div>

      {blockers.length>0&&(
        <section className="admin-card launch-blockers-card">
          <div className="section-heading compact-heading">
            <div>
              <p className="eyebrow red">Production Blockers</p>
              <h2>Clear these before going live</h2>
            </div>
            <button className="secondary-button" type="button" onClick={()=>void load()}>
              Recheck
            </button>
          </div>
          <div className="launch-priority-list">
            {blockers.map((check)=>(
              <article key={check.check_key}>
                <span>BLOCKER · {check.area}</span>
                <h3>{check.title}</h3>
                <p>{check.detail}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {warnings.length>0&&(
        <section className="admin-card">
          <div className="section-heading compact-heading">
            <div>
              <p className="eyebrow gold">Warnings</p>
              <h2>Recommended before launch</h2>
            </div>
          </div>
          <div className="launch-warning-list">
            {warnings.map((check)=>(
              <article key={check.check_key}>
                <div>
                  <strong>{check.title}</strong>
                  <small>{check.area}</small>
                </div>
                <p>{check.detail}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="launch-gate-areas">
        {grouped.map(([area,areaChecks])=>{
          const areaPassed=areaChecks.filter((item)=>item.passed).length;
          const areaBlockers=areaChecks.filter((item)=>item.severity==="blocker"&&!item.passed).length;

          return (
            <article key={area}>
              <div className="launch-area-head">
                <div>
                  <span>{areaBlockers?"Needs attention":"Current"}</span>
                  <h3>{area}</h3>
                </div>
                <strong>{areaPassed}/{areaChecks.length}</strong>
              </div>

              <div className="launch-area-checks">
                {areaChecks.map((check)=>(
                  <div className={check.passed?"pass":check.severity==="blocker"?"fail":"warning"} key={check.check_key}>
                    <span>{check.passed?"✓":check.severity==="blocker"?"!":"•"}</span>
                    <div>
                      <strong>{check.title}</strong>
                      <small>{check.detail}</small>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </section>

      <section className="admin-card launch-gate-note">
        <p className="eyebrow red">Important</p>
        <h2>Build passing is not the same as launch ready</h2>
        <p>
          A green CI build proves the software compiles. This Launch Gate is stricter. It checks whether the
          actual operational systems required to serve families safely are configured and healthy.
        </p>
      </section>
    </div>
  );
}
