"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Check, ShieldCheck, Sparkles } from "lucide-react";
const API=process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";
export function AuthForm({mode}:{mode:"login"|"register"}) {
  const router=useRouter(); const [error,setError]=useState(""); const [busy,setBusy]=useState(false);
  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError("");const data=Object.fromEntries(new FormData(e.currentTarget).entries());try{const res=await fetch(`${API}/auth/${mode}`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});if(!res.ok){const body=await res.json().catch(()=>({}));throw new Error(body.message||body.error||body.detail||"Unable to sign in. Please try again.");}router.push("/dashboard");}catch(err){setError(err instanceof Error?err.message:"The API could not be reached. Start the Spring Boot service and try again.");}finally{setBusy(false);}}
  const isLogin=mode==="login";
  return <main className="auth-page auth-premium">
    <div className="auth-aurora auth-aurora-one"/><div className="auth-aurora auth-aurora-two"/>
    <header className="auth-nav"><Link className="brand brand-hero" href="/"><span className="brand-mark">S</span><span>smart study</span></Link><Link className="auth-back" href="/">Back to home <ArrowUpRight size={14}/></Link></header>
    <section className="auth-shell">
      <aside className="auth-story premium-reveal"><div><p className="eyebrow eyebrow-glow"><Sparkles size={13}/> Intentional learning</p><h1>{isLogin?"Your next focused hour starts here.":"A calmer way to make progress."}</h1><p>{isLogin?"Return to your notes, your plan, and the momentum you have already built.":"Bring every material, study block, and small breakthrough into one considered space."}</p></div><div className="auth-story-points"><span><Check size={15}/> Clear next steps, every day</span><span><Check size={15}/> Source-aware practice tools</span><span><Check size={15}/> Your rhythm, made visible</span></div><div className="auth-story-orbit"><span>Focus</span><b>✦</b><span>Flow</span></div></aside>
      <section className="auth-card glass-panel premium-reveal-delayed"><div className="auth-card-top"><p className="eyebrow">{isLogin?"Welcome back":"A fresh start"}</p><span className="auth-lock"><ShieldCheck size={16}/></span></div><h2>{isLogin?"Pick up where you left off.":"Build a better study rhythm."}</h2><p className="auth-copy">{isLogin?"Sign in to return to your study space.":"Create an account and make room for real understanding."}</p><form onSubmit={submit}>{!isLogin&&<><label>Your name<input name="name" autoComplete="name" required maxLength={120} placeholder="Your name"/></label><label>Account type<select name="role" defaultValue="STUDENT"><option value="STUDENT">Student</option><option value="PARENT">Parent</option></select></label></>}<label>Email address<input name="email" type="email" autoComplete="email" required placeholder="you@example.com"/></label><label>Password<input name="password" type="password" autoComplete={isLogin?"current-password":"new-password"} required minLength={isLogin?1:10} maxLength={72} placeholder="••••••••"/>{!isLogin&&<small>Use at least 10 characters.</small>}</label>{error&&<p className="form-error" role="alert">{error}</p>}<button className="button primary auth-submit" disabled={busy}>{busy?"One moment...":isLogin?"Sign in":"Create my space"}<ArrowUpRight size={16}/></button></form><p className="auth-switch">{isLogin?"New to Smart Study?":"Already have an account?"} <Link href={isLogin?"/register":"/login"}>{isLogin?"Create an account":"Sign in"}</Link></p></section>
    </section>
    <footer className="auth-foot">Your study data stays under your account. <span>•</span> Built for calm, considered progress.</footer>
  </main>;
}
