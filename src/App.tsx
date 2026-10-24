import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowDownRight, ArrowRight, Bell, Compass, Home, Layers3, Menu,
  MessageCircle, Plus, Search, Settings2, ShieldCheck, Sparkles,
  Users, X, LogOut, UserRound, Heart, Bookmark, Send, CheckCircle2
} from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "./lib/supabase";

type Section = "Home" | "Discover" | "Communities" | "Messages" | "Profile";
const navItems: { label: Section; icon: typeof Home }[] = [
  { label: "Home", icon: Home },
  { label: "Discover", icon: Compass },
  { label: "Communities", icon: Users },
  { label: "Messages", icon: MessageCircle },
  { label: "Profile", icon: UserRound },
];

function App() {
  const [section, setSection] = useState<Section>("Home");
  const [session, setSession] = useState<Session | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [query, setQuery] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState<string[]>([]);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    if (!supabase) {
      setNotice("Connect your Supabase project first using the deployment setup instructions.");
      return;
    }
    setBusy(true);
    try {
      if (authMode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName.trim() } },
        });
        if (error) throw error;
        setNotice("Account request received. Check your email if confirmation is enabled.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setAuthOpen(false);
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Authentication could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    setSession(null);
    setSection("Home");
  }

  function openAuth(mode: "signin" | "signup") {
    setAuthMode(mode);
    setNotice("");
    setAuthOpen(true);
  }

  function publishDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.trim()) return;
    setNotice("Your draft is ready. Sign in and connect a posts table before publishing to the community.");
    setComposerOpen(false);
  }

  const emailLabel = session?.user.email ?? "";
  const displayName = String(session?.user.user_metadata?.full_name || emailLabel.split("@")[0] || "there");

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" onClick={() => setSection("Home")} aria-label="DAWG home">
          <span className="brand-mark">D</span><span>DAWG<span className="brand-period">.</span></span>
        </a>
        <div className="top-search"><Search size={17}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search people, ideas, communities" aria-label="Search"/></div>
        <div className="top-actions">
          <button className="icon-button" aria-label="Notifications" onClick={() => setNotice("Notifications will appear here once the notification service is connected.")}><Bell size={19}/></button>
          {session ? <button className="avatar-button" onClick={() => setSection("Profile")} title="Open profile">{displayName.slice(0,1).toUpperCase()}</button> : <button className="button button-dark top-join" onClick={() => openAuth("signup")}>Join DAWG <ArrowRight size={15}/></button>}
          <button className="icon-button mobile-menu-button" aria-label="Open navigation" onClick={() => setMobileMenu(!mobileMenu)}>{mobileMenu ? <X size={20}/> : <Menu size={20}/>}</button>
        </div>
      </header>

      <div className="workspace">
        <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
          <div className="sidebar-label">YOUR SPACE</div>
          <nav className="side-nav" aria-label="Main navigation">
            {navItems.map(({ label, icon: Icon }) => <button key={label} className={`nav-item ${section === label ? "active" : ""}`} onClick={() => { setSection(label); setMobileMenu(false); }}>
              <Icon size={18} strokeWidth={1.8}/><span>{label}</span>{label === "Messages" && <span className="nav-arrow"><ArrowDownRight size={14}/></span>}
            </button>)}
          </nav>
          <div className="sidebar-rule"/>
          <div className="sidebar-label">YOUR WORLD</div>
          <button className="nav-item" onClick={() => setSection("Communities")}><Layers3 size={18}/><span>My spaces</span></button>
          <button className="nav-item" onClick={() => setNotice("Saved items are stored locally in this preview. Account-synced bookmarks will be added with the database schema.")}><Bookmark size={18}/><span>Saved</span></button>
          <div className="sidebar-bottom">
            <div className="sidebar-prompt"><span className="prompt-icon"><Sparkles size={16}/></span><strong>Good things start together.</strong><p>Find your people. Make something happen.</p><button onClick={() => openAuth("signup")}>Get started <ArrowRight size={14}/></button></div>
            {session && <button className="nav-item signout" onClick={signOut}><LogOut size={17}/><span>Sign out</span></button>}
            <div className="side-footer">DAWG © 2026 <span>Built for belonging.</span></div>
          </div>
        </aside>

        <main className="main-content">
          {notice && <div className="notice" role="status"><span>{notice}</span><button aria-label="Dismiss" onClick={() => setNotice("")}><X size={15}/></button></div>}
          {!session && <section className="welcome-banner">
            <div className="welcome-copy"><div className="eyebrow"><span className="eyebrow-dot"/> A NEW KIND OF TOGETHER</div><h1>Life moves better<br/><span>with your people.</span></h1><p>Find your people, discover what matters, and turn good intentions into something real.</p><div className="welcome-buttons"><button className="button button-dark" onClick={() => openAuth("signup")}>Find your people <ArrowRight size={16}/></button><button className="text-button" onClick={() => setSection("Discover")}>Explore DAWG <ArrowDownRight size={16}/></button></div></div>
            <div className="welcome-art" aria-hidden="true"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="art-core"><span>D</span></div><div className="art-node node-a">✳</div><div className="art-node node-b"><Users size={19}/></div><div className="art-node node-c"><Sparkles size={18}/></div><div className="art-caption">BETTER, TOGETHER.</div></div>
          </section>}

          <section className="content-heading">
            <div><div className="eyebrow muted-eyebrow">{section === "Home" ? "YOUR DAILY SPACE" : "EXPLORE DAWG"}</div><h2>{section === "Home" ? (session ? `Welcome back, ${displayName}.` : "A little closer, every day.") : section}</h2><p>{sectionDescription(section, Boolean(session))}</p></div>
            {section === "Home" && <button className="button button-outline" onClick={() => setComposerOpen(true)}><Plus size={17}/> Create a post</button>}
          </section>

          {section === "Home" && <HomeContent openAuth={openAuth} setSection={setSection} saved={saved} setSaved={setSaved} />}
          {section === "Discover" && <DiscoverContent query={query} setSection={setSection} openAuth={openAuth}/>}
          {section === "Communities" && <CommunitiesContent openAuth={openAuth}/>}
          {section === "Messages" && <MessagesContent openAuth={openAuth}/>}
          {section === "Profile" && <ProfileContent session={session} displayName={displayName} email={emailLabel} openAuth={openAuth}/>}
          <footer className="mobile-footer"><span>DAWG © 2026</span><span>Life moves better together.</span></footer>
        </main>

        <aside className="right-rail">
          <div className="rail-topline"><span>THE DAWG NOTE</span><Sparkles size={15}/></div>
          <div className="note-card"><div className="note-number">01 / A REMINDER</div><h3>You don't have to do it all alone.</h3><p>The best things rarely happen in isolation. Start with one conversation.</p><button onClick={() => openAuth("signup")}>Make a connection <ArrowRight size={14}/></button><div className="note-decoration">✳</div></div>
          <div className="rail-section"><div className="rail-heading">START SOMEWHERE <ArrowDownRight size={14}/></div><button className="quick-link" onClick={() => setSection("Discover")}><span className="quick-icon lavender"><Compass size={17}/></span><span><strong>Explore ideas</strong><small>See what sparks your interest</small></span><ArrowRight size={15}/></button><button className="quick-link" onClick={() => setSection("Communities")}><span className="quick-icon peach"><Users size={17}/></span><span><strong>Find your circle</strong><small>Make room for shared interests</small></span><ArrowRight size={15}/></button><button className="quick-link" onClick={() => setSection("Messages")}><span className="quick-icon mint"><MessageCircle size={17}/></span><span><strong>Start a conversation</strong><small>Every connection starts somewhere</small></span><ArrowRight size={15}/></button></div>
          <div className="rail-status"><span className={supabaseConfigured ? "status-dot live" : "status-dot"}/><span>{supabaseConfigured ? "Supabase configured" : "Setup in progress"}</span><button onClick={() => setNotice(supabaseConfigured ? "Supabase environment variables are present. Database-backed features still require schema and RLS setup." : "Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to Cloudflare Workers variables and your local .env.local file.")}><Settings2 size={14}/></button></div>
        </aside>
      </div>

      {composerOpen && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setComposerOpen(false); }}><section className="auth-modal composer-modal" role="dialog" aria-modal="true" aria-labelledby="composer-title"><button className="modal-close" onClick={() => setComposerOpen(false)} aria-label="Close"><X size={19}/></button><div className="modal-symbol"><Plus size={22}/></div><div className="eyebrow muted-eyebrow">SHARE A THOUGHT</div><h2 id="composer-title">Start a conversation.</h2><form onSubmit={publishDraft}><textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="What's on your mind?" rows={5} required maxLength={1000}/><div className="form-foot"><span>{draft.length}/1000</span><button className="button button-dark" type="submit">Continue <Send size={15}/></button></div></form><p className="modal-footnote">Publishing will be enabled after the secure posts database is connected.</p></section></div>}

      {authOpen && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setAuthOpen(false); }}><section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title"><button className="modal-close" onClick={() => setAuthOpen(false)} aria-label="Close"><X size={19}/></button><div className="modal-brand"><span className="brand-mark">D</span><span>DAWG<span className="brand-period">.</span></span></div><div className="eyebrow muted-eyebrow">{authMode === "signup" ? "YOUR NEXT CHAPTER" : "WELCOME BACK"}</div><h2 id="auth-title">{authMode === "signup" ? "Come as you are." : "Good to see you."}</h2><p className="modal-description">{authMode === "signup" ? "Create your account. Your people are out there." : "Pick up where you left off."}</p><form onSubmit={handleAuth} className="auth-form">{authMode === "signup" && <label>Your name<input autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="How should we call you?" required/></label>}<label>Email address<input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required/></label><label>Password<input type="password" autoComplete={authMode === "signup" ? "new-password" : "current-password"} minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" required/></label>{notice && <p className="form-message" role="status">{notice}</p>}<button className="button button-dark auth-submit" type="submit" disabled={busy}>{busy ? "Please wait…" : authMode === "signup" ? "Create account" : "Sign in"} <ArrowRight size={16}/></button></form>{!supabaseConfigured && <div className="setup-hint"><ShieldCheck size={16}/><span>Account access activates when your Supabase URL and publishable key are configured.</span></div>}<p className="auth-switch">{authMode === "signup" ? "Already part of DAWG?" : "New around here?"} <button onClick={() => { setAuthMode(authMode === "signup" ? "signin" : "signup"); setNotice(""); }}>{authMode === "signup" ? "Sign in" : "Create an account"}</button></p><p className="modal-footnote">By continuing, you agree to use DAWG respectfully. Terms and privacy details will be published before public launch.</p></section></div>}
    </div>
  );
}

function sectionDescription(section: Section, signedIn: boolean) {
  if (section === "Home") return signedIn ? "Your space to reconnect, discover and make things happen." : "A space for the things and people that make life feel more like yours.";
  if (section === "Discover") return "Follow your curiosity. Your next favourite thing could start here.";
  if (section === "Communities") return "Shared interests are a good place to begin.";
  if (section === "Messages") return "Good conversations make the distance feel smaller.";
  return "A little space that's yours.";
}

function HomeContent({ openAuth, setSection, saved, setSaved }: { openAuth: (m: "signin" | "signup") => void; setSection: (s: Section) => void; saved: string[]; setSaved: (s: string[]) => void }) {
  return <div className="home-grid"><section className="main-column"><div className="section-kicker"><span>YOUR NEXT STEP</span><span className="kicker-line"/></div><button className="feature-card" onClick={() => setSection("Discover")}><div className="feature-top"><span className="feature-tag">A PLACE TO BEGIN</span><ArrowUpRightIcon/></div><div className="feature-illustration"><div className="feature-circle circle-one"/><div className="feature-circle circle-two"/><div className="feature-asterisk">✳</div><div className="feature-word">go<br/>together<span>.</span></div></div><div className="feature-bottom"><div><h3>Follow what moves you.</h3><p>Explore interests, people and communities that feel like your kind of thing.</p></div><span className="round-arrow"><ArrowRight size={18}/></span></div></button><div className="section-kicker below-kicker"><span>MAKE IT YOURS</span><span className="kicker-line"/></div><div className="action-row"><button className="action-card" onClick={() => openAuth("signup")}><span className="action-icon"><Users size={19}/></span><strong>Find your people</strong><span>Connections begin with a hello.</span><ArrowRight size={15}/></button><button className="action-card" onClick={() => setSection("Communities")}><span className="action-icon action-icon-pink"><Layers3 size={19}/></span><strong>Build a circle</strong><span>Make space for shared interests.</span><ArrowRight size={15}/></button></div></section><section className="side-column"><div className="section-kicker"><span>SMALL THINGS, BIG STARTS</span></div><div className="starter-list"><div className="starter-item"><span className="starter-number">01</span><div><strong>Be curious.</strong><p>Follow an interest you haven't made time for yet.</p></div></div><div className="starter-item"><span className="starter-number">02</span><div><strong>Say hello.</strong><p>One honest conversation can open a new door.</p></div></div><div className="starter-item"><span className="starter-number">03</span><div><strong>Show up.</strong><p>Belonging grows when we make room for each other.</p></div></div></div><div className="saved-card"><div className="saved-card-head"><Bookmark size={17}/><span>YOUR SHORTLIST</span></div><h3>Keep what inspires you.</h3><p>Save a starting point and come back when you're ready.</p><button onClick={() => setSaved(saved.includes("starter") ? saved.filter(x => x !== "starter") : [...saved, "starter"])}>{saved.includes("starter") ? <><CheckCircle2 size={15}/> Saved for later</> : <><Plus size={15}/> Save this reminder</>}</button></div></section></div>;
}

function ArrowUpRightIcon() { return <ArrowDownRight size={17} className="tilted-arrow"/>; }

function DiscoverContent({ query, setSection, openAuth }: { query: string; setSection: (s: Section) => void; openAuth: (m: "signin" | "signup") => void }) {
  const [filter, setFilter] = useState("All");
  const filters = ["All", "People", "Interests", "Communities"];
  const cards = [
    { id:"people", type:"People", icon:<Users size={20}/>, title:"People who get it", text:"Meet people who share the things you care about.", color:"lavender" },
    { id:"interests", type:"Interests", icon:<Sparkles size={20}/>, title:"Follow a curiosity", text:"Give a new interest a little room to grow.", color:"peach" },
    { id:"communities", type:"Communities", icon:<Layers3 size={20}/>, title:"Find your circle", text:"Shared interests can become real connections.", color:"mint" },
  ].filter(c => (filter === "All" || c.type === filter) && (c.title+" "+c.text).toLowerCase().includes(query.toLowerCase()));
  return <><div className="filter-tabs">{filters.map(f => <button key={f} className={filter === f ? "selected" : ""} onClick={() => setFilter(f)}>{f}</button>)}</div><div className="discover-grid">{cards.map(c => <article className="discover-card" key={c.id}><div className={`discover-icon ${c.color}`}>{c.icon}</div><div className="card-overline">{c.type}</div><h3>{c.title}</h3><p>{c.text}</p><button onClick={() => c.id === "communities" ? setSection("Communities") : openAuth("signup")}>Explore <ArrowRight size={15}/></button></article>)}</div><p className="data-note"><ShieldCheck size={15}/> This is the initial discovery experience. Live recommendations will appear when real platform content is connected.</p></>;
}

function CommunitiesContent({ openAuth }: { openAuth: (m: "signin" | "signup") => void }) {
  return <div className="empty-state"><div className="empty-symbol"><Users size={25}/></div><div className="eyebrow muted-eyebrow">YOUR PEOPLE, YOUR SPACE</div><h3>Good things grow in good company.</h3><p>Community creation and discovery will be powered by your DAWG account and Supabase data. No placeholder communities or invented member counts.</p><button className="button button-dark" onClick={() => openAuth("signup")}>Get started <ArrowRight size={16}/></button></div>;
}

function MessagesContent({ openAuth }: { openAuth: (m: "signin" | "signup") => void }) {
  return <div className="empty-state"><div className="empty-symbol"><MessageCircle size={25}/></div><div className="eyebrow muted-eyebrow">MAKE THE FIRST MOVE</div><h3>Every good connection starts somewhere.</h3><p>Private messaging needs authenticated users, conversation tables and strict database policies. We'll connect it after the core account foundation is verified.</p><button className="button button-dark" onClick={() => openAuth("signup")}>Create your account <ArrowRight size={16}/></button></div>;
}

function ProfileContent({ session, displayName, email, openAuth }: { session: Session | null; displayName: string; email: string; openAuth: (m: "signin" | "signup") => void }) {
  if (!session) return <div className="empty-state"><div className="empty-symbol"><UserRound size={25}/></div><div className="eyebrow muted-eyebrow">YOUR CORNER OF DAWG</div><h3>Your profile starts with you.</h3><p>Create an account to establish your identity. Profile editing, privacy settings and avatar uploads will be connected to your database-backed account.</p><button className="button button-dark" onClick={() => openAuth("signup")}>Create profile <ArrowRight size={16}/></button></div>;
  return <div className="profile-panel"><div className="profile-cover"/><div className="profile-details"><div className="profile-avatar">{displayName.slice(0,1).toUpperCase()}</div><h3>{displayName}</h3><p>{email}</p><span className="verified-label"><CheckCircle2 size={14}/> Signed in with Supabase</span><div className="profile-note">Your account is connected. The next milestone is creating the profile table and applying owner-only row-level security policies.</div></div></div>;
}

export default App;