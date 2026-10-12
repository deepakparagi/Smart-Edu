import Link from "next/link";
import { ArrowUpRight, BrainCircuit, Check, CirclePlay, Sparkles, TimerReset } from "lucide-react";

const proof = ["Turn notes into momentum", "Keep every study block visible", "Review with intention"];

export default function Home() {
  return <main className="landing landing-premium">
    <nav className="landing-nav">
      <Link className="brand brand-hero" href="/"><span className="brand-mark">S</span><span>smart study</span></Link>
      <div className="landing-nav-links"><a href="#how-it-works">How it works</a><Link href="/login">Sign in</Link><Link className="nav-cta" href="/register">Start free <ArrowUpRight size={15}/></Link></div>
    </nav>

    <section className="landing-stage">
      <div className="landing-copy premium-reveal">
        <p className="eyebrow eyebrow-glow"><Sparkles size={13}/> Learning, designed for focus</p>
        <h1>Study with a <span>clearer mind.</span></h1>
        <p className="subhead">A beautifully focused space for notes, plans, practice, and the small wins that add up.</p>
        <div className="actions">
          <Link className="button primary landing-primary" href="/register">Build your study space <ArrowUpRight size={17}/></Link>
          <Link className="button quiet landing-secondary" href="/dashboard"><CirclePlay size={17}/> Explore the preview</Link>
        </div>
        <div className="landing-proof">{proof.map((item) => <span key={item}><Check size={13}/>{item}</span>)}</div>
      </div>

      <div className="landing-art premium-reveal-delayed" aria-label="Smart Study dashboard preview">
        <div className="orb orb-one"/><div className="orb orb-two"/><div className="orb orb-three"/>
        <div className="hero-device brutal-shadow">
          <div className="hero-device-top"><span className="device-pulse"/><span>Today, September 23</span><span className="device-avatar">A</span></div>
          <div className="hero-device-content">
            <div className="hero-device-title"><div><small>YOUR DAILY RHYTHM</small><h2>Good afternoon,<br/>Alex.</h2></div><span className="hero-ring">74<small>%</small></span></div>
            <div className="hero-progress"><span>Weekly focus</span><strong>3h 48m</strong><div><i/><i/><i/><i className="is-active"/><i className="is-active"/><i className="is-active"/><i className="is-active"/></div></div>
            <div className="hero-mini-grid"><article><BrainCircuit size={19}/><span>Quick review</span><strong>12 cards due</strong></article><article><TimerReset size={19}/><span>Next focus</span><strong>25 minutes</strong></article></div>
          </div>
        </div>
        <div className="float-card float-card-one"><span className="float-icon">✦</span><div><small>Streak unlocked</small><strong>4 thoughtful days</strong></div></div>
        <div className="float-card float-card-two"><span className="float-chart"><i/><i/><i/><i/></span><div><small>Today&apos;s progress</small><strong>2 of 3 goals</strong></div></div>
      </div>
    </section>

    <section id="how-it-works" className="landing-strip"><p>ONE QUIET PLACE FOR</p><span>Materials</span><i/> <span>Plans</span><i/> <span>Focus</span><i/> <span>Practice</span><i/> <span>Progress</span></section>
    <footer className="landing-foot"><span>© 2026 Smart Study</span><span>Made for the way you learn <b>•</b> Built for real understanding</span></footer>
  </main>;
}
