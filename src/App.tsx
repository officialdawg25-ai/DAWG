import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowLeft, ArrowRight, ArrowUpRight, Check,
  UserRound, Menu, Minus, Plus, Search, ShieldCheck, ShoppingBag,
  SlidersHorizontal, X, LogOut, Package, Settings, LayoutDashboard, Shirt,
  Layers3, Truck, CreditCard, LoaderCircle, Image as ImageIcon, Save, Eye
} from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "./lib/supabase";

type Collection = { id: string; slug: string; name: string; description: string | null; image_url: string | null; status: string; sort_order: number };
type Product = { id: string; slug: string; name: string; description: string | null; collection_id: string | null; target_gender: "men" | "women" | "unisex"; status: string; price_cents: number; compare_at_price_cents: number | null; currency: string; image_url: string | null; sku: string | null; featured: boolean; has_variants: boolean; published_at: string | null; product_variants?: Variant[]; collections?: Collection | null };
type Variant = { id: string; product_id: string; size: string | null; colour: string | null; sku: string | null; price_cents: number | null; stock_on_hand: number; track_inventory: boolean; status: string; available?: boolean };
type CartLine = { product: Product; variant?: Variant; quantity: number };
type Route = { page: "home" | "shop" | "collections" | "story" | "account" | "bag" | "admin" | "product"; slug?: string };
type HeroConfig = { headlineFirst: string; headlineSecond: string; supportingText: string; primaryLabel: string; primaryDestination: "shop" | "collections"; secondaryLabel: string; secondaryDestination: "story" | "collections"; mediaType: "image" | "video" | "none"; mediaPath: string; mediaUrl?: string; mediaAlt: string; objectPosition: string; posterPath: string; posterUrl?: string };
type PublishedHeroConfig = Omit<HeroConfig, "mediaPath" | "posterPath"> & { mediaUrl?: string; posterUrl?: string; publishedAt?: string };
const defaultHeroConfig: HeroConfig = { headlineFirst: "EARNED.", headlineSecond: "NOT GIVEN.", supportingText: "Built for those who move with purpose. Clothing for the work, the setbacks, the discipline — and the person you're becoming.", primaryLabel: "Explore the collection", primaryDestination: "shop", secondaryLabel: "Discover the mindset", secondaryDestination: "story", mediaType: "none", mediaPath: "", mediaAlt: "", objectPosition: "center center", posterPath: "" };
const collectionsFallback = [
  { name: "KENN", descriptor: "Foundation & status", detail: "Identity. Presence. Belonging." },
  { name: "GRIT", descriptor: "Discipline & resilience", detail: "Consistency over comfort." },
  { name: "IVY", descriptor: "Knowledge & performance", detail: "Think clearly. Move deliberately." },
  { name: "ROAM", descriptor: "Freedom & exploration", detail: "Build life on your terms." },
  { name: "HOWL", descriptor: "Instinct & rebellion", detail: "Be unmistakably yourself." },
];
const money = (cents: number, currency = "ZAR") => new Intl.NumberFormat("en-ZA", { style: "currency", currency, maximumFractionDigits: 2 }).format(cents / 100);
function parseRoute(): Route {
  const raw = window.location.hash.replace(/^#\/?/, "");
  if (!raw) return { page: "home" };
  const [page, slug] = raw.split("/");
  if (["home", "shop", "collections", "story", "account", "bag", "admin", "product"].includes(page)) return { page: page as Route["page"], slug };
  return { page: "home" };
}
function go(page: string, slug?: string) { window.location.hash = slug ? `#/${page}/${slug}` : `#/${page}`; window.scrollTo({ top: 0, behavior: "smooth" }); }
function slugify(s: string) { return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

export default function App() {
  const [route, setRoute] = useState<Route>(() => parseRoute());
  const [session, setSession] = useState<Session | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartLine[]>(() => { try { return JSON.parse(localStorage.getItem("dawg-cart") || "[]"); } catch { return []; } });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup" | "reset">("signin");
  const [authOpen, setAuthOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminTab, setAdminTab] = useState<"overview" | "products" | "collections" | "orders" | "settings" | "hero">("overview");
  const [productEditor, setProductEditor] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productImage, setProductImage] = useState("");
  const [productCollection, setProductCollection] = useState("");
  const [productGender, setProductGender] = useState<"men" | "women" | "unisex">("unisex");
  const [productSku, setProductSku] = useState("");
  const [productSize, setProductSize] = useState("");
  const [productColour, setProductColour] = useState("");
  const [productStock, setProductStock] = useState("0");
  const [productStatus, setProductStatus] = useState<"draft" | "active">("draft");
  const [uploading, setUploading] = useState(false);
  const [collectionEditor, setCollectionEditor] = useState(false);
  const [collectionName, setCollectionName] = useState("");
  const [collectionDescription, setCollectionDescription] = useState("");
  const [collectionSlug, setCollectionSlug] = useState("");
  const [collectionStatus, setCollectionStatus] = useState<"draft" | "active">("draft");
  const [heroDraft, setHeroDraft] = useState<HeroConfig>(defaultHeroConfig);
  const [heroPublished, setHeroPublished] = useState<PublishedHeroConfig | null>(null);
  const [heroPreviewUrl, setHeroPreviewUrl] = useState("");
  const [heroPosterUrl, setHeroPosterUrl] = useState("");
  const [heroBusy, setHeroBusy] = useState(false);
  const [heroUploading, setHeroUploading] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  const refreshCatalogue = useCallback(async (forAdmin = false) => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    const [c, p] = await Promise.all([
      supabase.from("collections").select("*").order("sort_order"),
      supabase.from("products").select("*, collections(name,slug)").order("created_at", { ascending: false }),
    ]);
    if (c.error) console.warn("DAWG collections query:", c.error.message);
    if (p.error) console.warn("DAWG products query:", p.error.message);
    const productRows = (p.data || []) as Omit<Product, "product_variants">[];
    const ids = productRows.map(product => product.id);
    let variantRows: (Variant & { available?: boolean })[] = [];
    if (ids.length) {
      if (forAdmin) {
        const v = await supabase.from("product_variants").select("*").in("product_id", ids);
        if (v.error) console.warn("DAWG staff variants query:", v.error.message);
        variantRows = (v.data || []) as Variant[];
      } else {
        const v = await supabase.from("public_product_variants").select("*").in("product_id", ids);
        if (v.error) console.warn("DAWG public availability query:", v.error.message);
        variantRows = ((v.data || []) as Array<Omit<Variant, "stock_on_hand" | "stock_reserved" | "track_inventory"> & { available: boolean }>).map(variant => ({
          ...variant,
          // Public catalogue data intentionally exposes availability, not an invented stock count.
          stock_on_hand: 0,
          stock_reserved: 0,
          track_inventory: false,
          available: variant.available,
        }));
      }
    }
    setCollections((c.data || []) as Collection[]);
    setProducts(productRows.map(product => ({ ...product, product_variants: variantRows.filter(variant => variant.product_id === product.id) })) as Product[]);
    setLoading(false);
  }, []);

  const checkAdmin = useCallback(async (userId?: string): Promise<boolean> => {
    if (!supabase || !userId) { setIsAdmin(false); return false; }
    const { data, error } = await supabase.from("staff_roles").select("role").eq("user_id", userId).in("role", ["owner", "admin", "manager"]).maybeSingle();
    const allowed = !error && Boolean(data);
    setIsAdmin(allowed);
    return allowed;
  }, []);

  useEffect(() => {
    const onHash = () => { setRoute(parseRoute()); setMobileMenu(false); };
    window.addEventListener("hashchange", onHash);
    if (supabase) {
      supabase.auth.getSession().then(async ({ data }) => { setSession(data.session); const allowed = await checkAdmin(data.session?.user.id); await refreshCatalogue(allowed); });
      const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
        setSession(next);
        window.setTimeout(async () => { const allowed = await checkAdmin(next?.user.id); await refreshCatalogue(allowed); }, 0);
      });
      void refreshCatalogue();
      return () => { window.removeEventListener("hashchange", onHash); listener.subscription.unsubscribe(); };
    }
    setLoading(false);
    return () => window.removeEventListener("hashchange", onHash);
  }, [checkAdmin, refreshCatalogue]);

  useEffect(() => { localStorage.setItem("dawg-cart", JSON.stringify(cart)); }, [cart]);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.from("storefront_hero").select("config").eq("id", 1).maybeSingle().then(({data,error}) => {
      if (error) { console.warn("DAWG published hero query:", error.message); return; }
      if (active && data?.config) setHeroPublished(data.config as PublishedHeroConfig);
    });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!supabase || !isAdmin) return;
    let active = true;
    (async () => {
      const {data,error} = await supabase.from("storefront_hero_drafts").select("config").eq("id",1).maybeSingle();
      if (error) { console.warn("DAWG hero draft query:",error.message); return; }
      if (!active || !data?.config) return;
      const config = {...defaultHeroConfig,...(data.config as Partial<HeroConfig>)} as HeroConfig;
      setHeroDraft(config);
      if (config.mediaPath) {
        const {data:signed} = await supabase.storage.from("dawg-hero-drafts").createSignedUrl(config.mediaPath,3600);
        if (active) setHeroPreviewUrl(signed?.signedUrl || "");
      } else if (config.mediaUrl && active) setHeroPreviewUrl(config.mediaUrl);
      if (config.posterPath) {
        const {data:signedPoster} = await supabase.storage.from("dawg-hero-drafts").createSignedUrl(config.posterPath,3600);
        if (active) setHeroPosterUrl(signedPoster?.signedUrl || "");
      } else if (config.posterUrl && active) setHeroPosterUrl(config.posterUrl);
    })();
    return () => {active=false;};
  }, [isAdmin]);
  const activeProducts = useMemo(() => products.filter(p => p.status === "active" && Boolean(p.published_at) && new Date(p.published_at as string).getTime() <= Date.now()).filter(p => { const matchesSearch = !search || [p.name, p.description || "", p.sku || "", p.collections?.name || ""].join(" ").toLowerCase().includes(search.toLowerCase()); const matchesCollection = !route.slug || (route.slug === "men" ? (p.target_gender === "men" || p.target_gender === "unisex") : route.slug === "women" ? (p.target_gender === "women" || p.target_gender === "unisex") : p.collections?.slug === route.slug || p.collection_id === collections.find(c => c.slug === route.slug)?.id); return matchesSearch && matchesCollection; }), [products, search, route.slug, collections]);
  const featured = activeProducts.filter(p => p.featured).slice(0, 4);
  const shownFeatured = featured.length ? featured : activeProducts.slice(0, 4);
  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const cartTotal = cart.reduce((sum, line) => sum + (line.variant?.price_cents ?? line.product.price_cents) * line.quantity, 0);
  const collectionDisplay = collections.filter(c => c.status === "active").length ? collections.filter(c => c.status === "active").map(c => ({ name: c.name, descriptor: c.description || "Explore the collection", detail: c.description || "", slug: c.slug })) : collectionsFallback.map(c => ({ ...c, slug: slugify(c.name) }));
  const currentProduct = route.page === "product" ? products.find(p => p.slug === route.slug && (p.status === "active" || isAdmin)) : undefined;

  async function handleAuth(e: FormEvent) {
    e.preventDefault(); if (!supabase) { setNotice("Supabase is not configured for this deployment yet."); return; }
    setBusy(true); setNotice("");
    try {
      if (authMode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName.trim() }, emailRedirectTo: window.location.origin + "/#/account" } });
        if (error) throw error;
        setNotice("Account request received. Check your email if confirmation is enabled."); setAuthOpen(false);
      } else if (authMode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/#/account" });
        if (error) throw error;
        setNotice("If the email is registered, a password-reset link will be sent."); setAuthOpen(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) throw error;
        setAuthOpen(false); setNotice("Signed in successfully.");
      }
    } catch (err) { setNotice(err instanceof Error ? err.message : "Authentication could not be completed."); }
    finally { setBusy(false); }
  }
  async function signOut() { if (supabase) await supabase.auth.signOut(); setSession(null); setIsAdmin(false); go("home"); }
  function openAuth(mode: "signin" | "signup" | "reset" = "signin") { setAuthMode(mode); setAuthOpen(true); }
  function addToCart(product: Product, variant?: Variant) {
    if (!variant) { setNotice("This product has no available inventory variant. Please contact the store team."); return; }
    if (variant?.available === false || (variant?.available === undefined && variant?.track_inventory && variant.stock_on_hand < 1)) { setNotice("This variant is currently out of stock."); return; }
    setCart(old => {
      const key = variant?.id || product.id;
      const existing = old.find(line => (line.variant?.id || line.product.id) === key);
      if (existing) return old.map(line => (line.variant?.id || line.product.id) === key ? { ...line, quantity: Math.min(line.quantity + 1, variant?.track_inventory ? variant.stock_on_hand : 99) } : line);
      return [...old, { product, variant, quantity: 1 }];
    });
    setNotice(`${product.name} added to your bag.`);
  }
  function updateQty(key: string, quantity: number) {
    if (quantity < 1) { setCart(old => old.filter(line => (line.variant?.id || line.product.id) !== key)); return; }
    setCart(old => old.map(line => (line.variant?.id || line.product.id) === key ? { ...line, quantity: Math.min(quantity, line.variant?.track_inventory ? line.variant.stock_on_hand : 99) } : line));
  }
  function startProduct(p?: Product) {
    setEditingProduct(p || null); setProductName(p?.name || ""); setProductDescription(p?.description || "");
    setProductPrice(p ? String(p.price_cents / 100) : ""); setProductImage(p?.image_url || "");
    setProductCollection(p?.collection_id || ""); setProductGender(p?.target_gender || "unisex"); setProductSku(p?.sku || "");
    setProductSize(p?.product_variants?.[0]?.size || ""); setProductColour(p?.product_variants?.[0]?.colour || "");
    setProductStock(String(p?.product_variants?.[0]?.stock_on_hand ?? 0)); setProductStatus(p?.status === "active" ? "active" : "draft"); setProductEditor(true);
  }
  async function uploadProductImage(file?: File) {
    if (!file || !supabase) return;
    if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) { setNotice("Choose an image file no larger than 8 MB."); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `products/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("product-media").upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("product-media").getPublicUrl(path);
      setProductImage(data.publicUrl); setNotice("Product image uploaded.");
    } catch (err) { setNotice(err instanceof Error ? err.message : "Image upload failed."); }
    finally { setUploading(false); }
  }
  async function saveProduct(e: FormEvent) {
    e.preventDefault(); if (!supabase || !isAdmin) { setNotice("An authorised administrator session is required."); return; }
    const price = Number(productPrice);
    if (!productName.trim() || !Number.isFinite(price) || price < 0 || !Number.isInteger(Math.round(price * 100))) { setNotice("Enter a product name and a valid non-negative price."); return; }
    if (productStatus === "active" && price <= 0) { setNotice("Enter the confirmed retail price before publishing."); return; }
    if (productStatus === "active" && !productImage.trim()) { setNotice("Add approved product imagery before publishing this product."); return; }
    setBusy(true);
    try {
      const payload = { name: productName.trim(), slug: slugify(productName), description: productDescription.trim() || null, collection_id: productCollection || null, target_gender: productGender, price_cents: Math.round(price * 100), currency: "ZAR", image_url: productImage.trim() || null, sku: productSku.trim() || null, has_variants: Boolean(productSize.trim() || productColour.trim()), status: productStatus, published_at: productStatus === "active" ? (editingProduct?.published_at || new Date().toISOString()) : null };
      let productId = editingProduct?.id;
      if (editingProduct) {
        const { error } = await supabase.from("products").update(payload).eq("id", editingProduct.id); if (error) throw error;
      } else {
        const { data, error } = await supabase.from("products").insert(payload).select("id").single(); if (error) throw error; productId = data.id;
      }
      if (productId) {
        const variant = { product_id: productId, size: productSize.trim() || null, colour: productColour.trim() || null, sku: productSku.trim() || null, stock_on_hand: Math.max(0, Number.parseInt(productStock, 10) || 0), track_inventory: true, status: "active" };
        const oldVariant = editingProduct?.product_variants?.[0];
        if (oldVariant) { const { error } = await supabase.from("product_variants").update(variant).eq("id", oldVariant.id); if (error) throw error; }
        else { const { error } = await supabase.from("product_variants").insert(variant); if (error) throw error; }
      }
      setProductEditor(false); setNotice("Product saved."); await refreshCatalogue(isAdmin);
    } catch (err) { setNotice(err instanceof Error ? err.message : "Product could not be saved. Check admin permissions and database setup."); }
    finally { setBusy(false); }
  }

  async function uploadHeroMedia(file?: File) {
    if (!file || !supabase || !isAdmin) return;
    const images = ["image/jpeg","image/png","image/webp","image/avif"];
    const videos = ["video/mp4","video/webm"];
    const mediaType = images.includes(file.type) ? "image" : videos.includes(file.type) ? "video" : null;
    if (!mediaType) { setNotice("Choose a JPEG, PNG, WebP, AVIF, MP4, or WebM file."); return; }
    if (file.size > 50*1024*1024) { setNotice("Hero media must be 50 MB or smaller."); return; }
    setHeroUploading(true);
    try {
      const ext=file.name.split(".").pop()?.toLowerCase() || (mediaType==="video"?"mp4":"webp");
      const path=`hero/${crypto.randomUUID()}.${ext}`;
      const {error}=await supabase.storage.from("dawg-hero-drafts").upload(path,file,{upsert:false,contentType:file.type,cacheControl:"3600"});
      if(error) throw error;
      const {data:signed,error:signedError}=await supabase.storage.from("dawg-hero-drafts").createSignedUrl(path,3600);
      if(signedError) throw signedError;
      setHeroDraft(v=>({...v,mediaType,mediaPath:path,mediaUrl:"",mediaAlt:mediaType==="image"&&!v.mediaAlt?file.name.replace(/\.[^.]+$/,"").replace(/[-_]/g," "):v.mediaAlt}));
      setHeroPreviewUrl(signed.signedUrl);
      setNotice("Hero media uploaded to private draft storage. Save the draft, then publish when ready.");
    } catch(e) { setNotice(e instanceof Error?e.message:"Hero media upload failed."); }
    finally {setHeroUploading(false);}
  }
  async function uploadHeroPoster(file?: File) {
    if(!file||!supabase||!isAdmin) return;
    if(!["image/jpeg","image/png","image/webp","image/avif"].includes(file.type)||file.size>12*1024*1024){setNotice("Choose a JPEG, PNG, WebP, or AVIF poster no larger than 12 MB.");return;}
    setHeroUploading(true);
    try {
      const ext=file.name.split(".").pop()?.toLowerCase()||"webp";
      const path=`hero-posters/${crypto.randomUUID()}.${ext}`;
      const {error}=await supabase.storage.from("dawg-hero-drafts").upload(path,file,{upsert:false,contentType:file.type,cacheControl:"3600"});
      if(error)throw error;
      const {data:signed,error:signedError}=await supabase.storage.from("dawg-hero-drafts").createSignedUrl(path,3600);
      if(signedError)throw signedError;
      setHeroDraft(v=>({...v,posterPath:path,posterUrl:""}));setHeroPosterUrl(signed.signedUrl);setNotice("Video poster uploaded to private draft storage.");
    }catch(e){setNotice(e instanceof Error?e.message:"Poster upload failed.");}finally{setHeroUploading(false);}
  }
  async function saveHeroDraft() {
    if(!supabase||!isAdmin||!session){setNotice("An authorised administrator session is required.");return;}
    setHeroBusy(true);
    try {
      const {error}=await supabase.from("storefront_hero_drafts").upsert({id:1,config:heroDraft,updated_by:session.user.id},{onConflict:"id"});
      if(error)throw error;
      setNotice("Hero draft saved. The public storefront has not changed.");
    }catch(e){setNotice(e instanceof Error?e.message:"Hero draft could not be saved.");}finally{setHeroBusy(false);}
  }
  async function publishHero() {
    if(!supabase||!isAdmin||!session){setNotice("An authorised administrator session is required.");return;}
    setHeroBusy(true);
    let mediaUrl=heroDraft.mediaUrl||heroPublished?.mediaUrl||"";
    let posterUrl=heroDraft.posterUrl||heroPublished?.posterUrl||"";
    try {
      if(heroDraft.mediaPath){
        const {data:file,error:downloadError}=await supabase.storage.from("dawg-hero-drafts").download(heroDraft.mediaPath);
        if(downloadError||!file)throw downloadError||new Error("Could not read the private draft media.");
        const ext=heroDraft.mediaPath.split(".").pop()?.toLowerCase()||(heroDraft.mediaType==="video"?"mp4":"webp");
        const path=`hero/${crypto.randomUUID()}.${ext}`;
        const {error}=await supabase.storage.from("dawg-hero-public").upload(path,file,{upsert:false,contentType:file.type||(heroDraft.mediaType==="video"?"video/mp4":"image/webp"),cacheControl:"31536000"});
        if(error)throw error;
        mediaUrl=supabase.storage.from("dawg-hero-public").getPublicUrl(path).data.publicUrl;
      }
      if(heroDraft.posterPath){
        const {data:file,error:downloadError}=await supabase.storage.from("dawg-hero-drafts").download(heroDraft.posterPath);
        if(downloadError||!file)throw downloadError||new Error("Could not read the private video poster.");
        const ext=heroDraft.posterPath.split(".").pop()?.toLowerCase()||"webp";
        const path=`hero-posters/${crypto.randomUUID()}.${ext}`;
        const {error}=await supabase.storage.from("dawg-hero-public").upload(path,file,{upsert:false,contentType:file.type||"image/webp",cacheControl:"31536000"});
        if(error)throw error;
        posterUrl=supabase.storage.from("dawg-hero-public").getPublicUrl(path).data.publicUrl;
      }
      const published={...heroDraft,mediaPath:"",posterPath:"",mediaUrl,posterUrl,publishedAt:new Date().toISOString()};
      const {error}=await supabase.from("storefront_hero").upsert({id:1,config:published,published_at:published.publishedAt,updated_by:session.user.id},{onConflict:"id"});
      if(error)throw error;
      setHeroPublished(published as PublishedHeroConfig);setHeroPreviewUrl(mediaUrl||"");setHeroPosterUrl(posterUrl||"");
      setNotice("The new DAWG hero is published.");
    }catch(e){setNotice(e instanceof Error?e.message:"Hero publishing failed. The previous published hero remains unchanged.");}finally{setHeroBusy(false);}
  }

  async function saveCollection(e: FormEvent) {
    e.preventDefault(); if (!supabase || !isAdmin) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("collections").insert({ name: collectionName.trim(), slug: slugify(collectionSlug || collectionName), description: collectionDescription.trim() || null, status: collectionStatus, sort_order: collections.length + 1 });
      if (error) throw error;
      setCollectionEditor(false); setCollectionName(""); setCollectionSlug(""); setCollectionDescription(""); setNotice("Collection saved."); await refreshCatalogue(isAdmin);
    } catch (err) { setNotice(err instanceof Error ? err.message : "Collection could not be saved."); }
    finally { setBusy(false); }
  }

  return <div className={route.page === "home" ? "store-shell home-shell" : "store-shell"}>
    <header className={`store-header ${route.page === "home" ? "store-header-overlay" : ""}`}>
      <button className="mobile-menu-trigger" aria-label="Toggle navigation" onClick={() => setMobileMenu(v => !v)}>{mobileMenu ? <X/> : <Menu/>}</button>
      <a className="wordmark" href="#/home" aria-label="DAWG Clothing home">DAWG<span>®</span></a>
      <nav className={mobileMenu ? "store-nav nav-open" : "store-nav"} aria-label="Main navigation">
        <button onClick={() => go("shop")}>Shop all</button><button onClick={() => go("collections")}>Collections</button><button onClick={() => go("shop")}>New arrivals</button><button onClick={() => go("story")}>The mindset</button>
      </nav>
      <div className="header-actions">
        <label className="search-control" aria-label="Search the DAWG store"><Search size={19} strokeWidth={1.5}/><input aria-label="Search products" placeholder="Search" value={search} onChange={e => { setSearch(e.target.value); if (e.target.value) go("shop"); }}/>{search && <button aria-label="Clear search" onClick={() => setSearch("")}><X size={14} strokeWidth={1.5}/></button>}</label>
        <button className="header-icon account-icon" aria-label="Account" title="Account" onClick={() => session ? go("account") : openAuth("signin")}><UserRound size={19} strokeWidth={1.5}/></button>
        <button className="header-icon bag-icon" aria-label={`Shopping bag, ${cartCount} items`} title="Shopping bag" onClick={() => go("bag")}><ShoppingBag size={19} strokeWidth={1.5}/>{cartCount > 0 && <span>{cartCount}</span>}</button>
      </div>
    </header>

    {notice && <div className="store-notice" role="status"><span>{notice}</span><button aria-label="Dismiss notice" onClick={() => setNotice("")}><X size={15}/></button></div>}

    <main>
      {route.page === "home" && <><section className={heroPublished?.mediaUrl ? "hero hero-has-media" : "hero"} aria-labelledby="dawg-hero-title">
        {heroPublished?.mediaUrl && heroPublished.mediaType === "image" && <img className="hero-media" src={heroPublished.mediaUrl} alt={heroPublished.mediaAlt || ""} fetchPriority="high" decoding="async" style={{objectPosition:heroPublished.objectPosition||"center center"}}/>}
        {heroPublished?.mediaUrl && heroPublished.mediaType === "video" && <video className="hero-media" autoPlay={!reduceMotion} controls={reduceMotion} muted loop playsInline preload={reduceMotion?"none":"metadata"} poster={heroPublished.posterUrl||undefined} aria-label={heroPublished.mediaAlt||"DAWG campaign film"}><source src={heroPublished.mediaUrl}/></video>}
        <div className="hero-scrim" aria-hidden="true"/>
        <div className="hero-main"><div className="hero-heading-wrap"><p className="hero-index">THE STANDARD IS EARNED</p><h1 id="dawg-hero-title"><span className="hero-line hero-line-one">{heroPublished?.headlineFirst||defaultHeroConfig.headlineFirst}</span><span className="hero-line hero-line-two">{heroPublished?.headlineSecond||defaultHeroConfig.headlineSecond}</span></h1></div><div className="hero-aside"><span className="hero-rule"/><p>{heroPublished?.supportingText||defaultHeroConfig.supportingText}</p><div className="hero-ctas"><button className="button-dark" onClick={()=>go(heroPublished?.primaryDestination||"shop")}>{heroPublished?.primaryLabel||defaultHeroConfig.primaryLabel} <ArrowRight size={16} strokeWidth={1.5}/></button><button className="hero-secondary" onClick={()=>go(heroPublished?.secondaryDestination||"story")}>{heroPublished?.secondaryLabel||defaultHeroConfig.secondaryLabel} <ArrowUpRight size={15} strokeWidth={1.5}/></button></div></div></div>
      </section>
      <section className="manifesto-strip"><span className="strip-label">THE DAWG CODE</span><p>Discipline is a decision.<br/><span>Excellence is a practice.</span></p><button onClick={() => go("story")}>Read our philosophy <ArrowUpRight size={15}/></button></section>
      <section className="collection-section section-pad"><div className="section-heading audience-heading"><div><p className="eyebrow">FIND YOUR FIT</p><h2>Made for <em>your way.</em></h2><p className="section-deck">Considered pieces for every expression of ambition.</p></div><button className="text-link" onClick={() => go("collections")}>Explore all collections <ArrowRight size={15}/></button></div>
        <div className="audience-grid"><button className="audience-card audience-men" onClick={() => go("shop", "men")}><span className="audience-kicker">01 / THE EDIT</span><span className="audience-title">SHOP FOR<br/><em>MEN</em></span><span className="audience-cta">Explore menswear <ArrowUpRight size={17}/></span></button><button className="audience-card audience-women" onClick={() => go("shop", "women")}><span className="audience-kicker">02 / THE EDIT</span><span className="audience-title">SHOP FOR<br/><em>WOMEN</em></span><span className="audience-cta">Explore womenswear <ArrowUpRight size={17}/></span></button></div>
        <div className="featured-collections-heading"><div><p className="eyebrow">THE SIGNATURE COLLECTIONS</p><h3>Two ways to <em>move forward.</em></h3></div><span>IVY / GRIT</span></div><div className="collection-grid signature-collection-grid">{collectionDisplay.filter(c => ["ivy","grit"].includes(c.slug)).sort((a,b) => ["ivy","grit"].indexOf(a.slug)-["ivy","grit"].indexOf(b.slug)).map((c, i) => <button key={c.slug} className={`collection-tile tile-${i === 0 ? 3 : 2}`} onClick={() => go("shop", c.slug)}><span className="tile-number">0{i + 1} / COLLECTION</span><span className="tile-glyph">{c.name.slice(0,1)}</span><span className="tile-bottom"><span><strong>{c.name}</strong><small>{c.descriptor}</small><small className="tile-detail">{c.detail}</small></span><ArrowUpRight size={18}/></span></button>)}</div>
      </section>
      <section className="product-section section-pad"><div className="section-heading"><div><p className="eyebrow">THE CURRENT LINEUP</p><h2>Made to move<br/><em>with intention.</em></h2></div><button className="text-link" onClick={() => go("shop")}>Shop all <ArrowRight size={15}/></button></div>
        {loading ? <div className="empty-state"><LoaderCircle className="spin" size={22}/><p>Loading the collection…</p></div> : shownFeatured.length ? <ProductGrid products={shownFeatured} onOpen={p => go("product", p.slug)} /> : <div className="empty-catalogue"><span className="empty-mark">D.</span><div><p className="eyebrow">THE NEXT DROP IS BEING BUILT</p><h3>Good things take work.</h3><p>There are no published products just yet. The DAWG catalogue will appear here when products are ready.</p></div><button className="button-outline-dark" onClick={() => go("collections")}>Explore the collections <ArrowRight size={15}/></button></div>}
      </section>
      <section className="closing-banner"><div><p className="eyebrow">FOR THE WORK IN PROGRESS</p><h2>Become who<br/><em>you said you'd be.</em></h2></div><button className="button-light" onClick={() => go("story")}>The DAWG mindset <ArrowUpRight size={16}/></button><span className="closing-stamp">D / A / W / G</span></section></>}

      {route.page === "shop" && <section className="page-section section-pad"><div className="page-intro"><p className="eyebrow">{route.slug === "men" ? "THE MENSWEAR EDIT" : route.slug === "women" ? "THE WOMENSWEAR EDIT" : "THE DAWG STORE"}</p><h1>{route.slug === "men" ? <>Shop for <em>men.</em></> : route.slug === "women" ? <>Shop for <em>women.</em></> : <>Shop <em>the standard.</em></>}</h1><p>{route.slug === "men" ? "Purposeful essentials, considered for the way you move." : route.slug === "women" ? "Purposeful essentials, considered for the way you move." : "Considered essentials for people who do the work."}</p></div><div className="shop-toolbar"><span>{activeProducts.length} {activeProducts.length === 1 ? "product" : "products"}{search ? ` matching “${search}”` : ""}</span><button className="filter-button" onClick={() => setSearch("")}><SlidersHorizontal size={15}/> {search ? "Clear search" : "All products"}</button></div>
        {loading ? <div className="empty-state"><LoaderCircle className="spin" size={22}/><p>Loading products…</p></div> : activeProducts.length ? <ProductGrid products={activeProducts} onOpen={p => go("product", p.slug)}/> : <div className="empty-catalogue"><span className="empty-mark">D.</span><div><p className="eyebrow">{search ? "NO MATCHES FOUND" : "CATALOGUE IN PREPARATION"}</p><h3>{search ? "Try another search." : "The first drop is on its way."}</h3><p>{search ? "Try a different product name or clear your search." : "Products will appear here once the DAWG team has added and published them."}</p></div><button className="button-outline-dark" onClick={() => { setSearch(""); go("collections"); }}>Explore collections <ArrowRight size={15}/></button></div>}
      </section>}

      {route.page === "collections" && <section className="page-section section-pad"><div className="page-intro"><p className="eyebrow">THE DAWG UNIVERSE</p><h1>Find your <em>expression.</em></h1><p>Five collection identities. One shared standard: earned, never given.</p></div><div className="collection-grid collections-page-grid">{collectionDisplay.map((c, i) => { return <button key={c.slug} className={`collection-tile tile-${(i % 5) + 1}`} onClick={() => { setSearch(""); go("shop", c.slug); }}><span className="tile-number">0{i + 1} / COLLECTION</span><span className="tile-glyph">{c.name.slice(0,1)}</span><span className="tile-bottom"><span><strong>{c.name}</strong><small>{c.descriptor}</small><small className="tile-detail">{c.detail}</small></span><ArrowUpRight size={18}/></span></button>; })}</div></section>}

      {route.page === "story" && <section className="story-page section-pad"><p className="eyebrow">THE DAWG MINDSET</p><h1>Success is earned.<br/><em>Not given.</em></h1><div className="story-copy"><p className="story-lead">DAWG is for the ones who understand that the person you become is built in the moments nobody sees.</p><p>It is the decision to show up again. To learn when it is uncomfortable. To build with intention. To keep your word when it would be easier not to.</p><p>We believe ambition means little without action, and talent means little without discipline. The work is the point. Growth is the reward.</p></div><div className="values-grid">{[["D","DRIVE","Move with purpose."],["A","AMBITION","Set a higher standard."],["W","WORK","Earn every step."],["G","GROWTH","Keep becoming."]].map(([letter, title, body]) => <div className="value-item" key={letter}><span>{letter}</span><strong>{title}</strong><p>{body}</p></div>)}</div><button className="button-dark" onClick={() => go("shop")}>Explore DAWG Clothing <ArrowRight size={16}/></button></section>}

      {route.page === "product" && <section className="product-detail section-pad">{currentProduct ? <><button className="back-link" onClick={() => go("shop")}><ArrowLeft size={15}/> Back to shop</button><div className="detail-layout"><div className="detail-image">{currentProduct.image_url ? <img src={currentProduct.image_url} alt={currentProduct.name}/> : <div className="product-placeholder"><span>DAWG</span><small>PRODUCT IMAGE PENDING</small></div>}</div><div className="detail-copy"><p className="eyebrow">{currentProduct.collections?.name || "DAWG CLOTHING"}</p><h1>{currentProduct.name}</h1><p className="detail-price">{money(currentProduct.price_cents, currentProduct.currency)}</p>{currentProduct.description && <p className="detail-description">{currentProduct.description}</p>}<VariantPicker product={currentProduct} onAdd={variant => addToCart(currentProduct, variant)}/><p className="detail-note"><ShieldCheck size={16}/> Secure checkout will be available once the store's payment provider is configured.</p></div></div></> : <div className="empty-state"><p>This product is unavailable or has not been published.</p><button className="button-dark" onClick={() => go("shop")}>Return to shop</button></div>}</section>}

      {route.page === "bag" && <section className="page-section section-pad"><div className="page-intro"><p className="eyebrow">YOUR SELECTION</p><h1>Your <em>bag.</em></h1><p>Every piece starts with a decision.</p></div>{cart.length ? <div className="cart-layout"><div className="cart-lines">{cart.map(line => { const key = line.variant?.id || line.product.id; const price = line.variant?.price_cents ?? line.product.price_cents; return <div className="cart-line" key={key}><div className="cart-thumb">{line.product.image_url ? <img src={line.product.image_url} alt=""/> : <span>D.</span>}</div><div className="cart-line-info"><button className="cart-product-name" onClick={() => go("product", line.product.slug)}>{line.product.name}</button><span>{[line.variant?.size, line.variant?.colour].filter(Boolean).join(" / ") || "Standard"}</span><strong>{money(price, line.product.currency)}</strong><div className="qty-control"><button aria-label="Decrease quantity" onClick={() => updateQty(key, line.quantity - 1)}><Minus size={13}/></button><span>{line.quantity}</span><button aria-label="Increase quantity" onClick={() => updateQty(key, line.quantity + 1)} disabled={Boolean(line.variant?.track_inventory && line.quantity >= line.variant.stock_on_hand)}><Plus size={13}/></button></div></div><button className="remove-line" onClick={() => updateQty(key, 0)} aria-label="Remove item"><X size={16}/></button></div>; })}</div><aside className="cart-summary"><p className="eyebrow">ORDER SUMMARY</p><div><span>Subtotal</span><strong>{money(cartTotal)}</strong></div><div><span>Shipping</span><span>Calculated at checkout</span></div><div className="summary-total"><span>Total</span><strong>{money(cartTotal)}</strong></div><button className="button-dark checkout-button" onClick={() => { setNotice("Checkout is not yet enabled: payment-provider credentials and server-side payment verification must be configured before collecting money."); }}>Continue to checkout <ArrowRight size={16}/></button><p className="checkout-hint">No payment will be collected until a verified provider is connected.</p><button className="text-link" onClick={() => go("shop")}>Continue shopping</button></aside></div> : <div className="empty-catalogue"><span className="empty-mark"><ShoppingBag size={26}/></span><div><p className="eyebrow">NOTHING IN THE BAG</p><h3>Make your first move.</h3><p>Your selected pieces will live here.</p></div><button className="button-outline-dark" onClick={() => go("shop")}>Explore the store <ArrowRight size={15}/></button></div>}</section>}

      {route.page === "account" && <section className="account-page section-pad"><p className="eyebrow">YOUR DAWG ACCOUNT</p><h1>Your space.<br/><em>Your journey.</em></h1>{session ? <div className="account-panel"><div className="account-avatar">{(session.user.user_metadata?.full_name || session.user.email || "D").toString().slice(0,1).toUpperCase()}</div><div><h2>{String(session.user.user_metadata?.full_name || "DAWG member")}</h2><p>{session.user.email}</p><span className="status-pill"><Check size={13}/> Authenticated account</span></div><button className="button-outline-dark" onClick={signOut}><LogOut size={15}/> Sign out</button>{isAdmin && <button className="button-dark" onClick={() => go("admin")}><LayoutDashboard size={15}/> Open store admin</button>}</div> : <div className="account-panel"><p>Sign in or create an account to manage your details and future orders.</p><button className="button-dark" onClick={() => openAuth("signin")}>Sign in <ArrowRight size={15}/></button><button className="button-outline-dark" onClick={() => openAuth("signup")}>Create account</button></div>}</section>}

      {route.page === "admin" && <section className="admin-page section-pad">{isAdmin ? <><div className="admin-title-row"><div><p className="eyebrow">DAWG COMMERCE</p><h1>Store <em>management.</em></h1><p>Manage the catalogue and store operations from one place.</p></div><span className="admin-verified"><ShieldCheck size={15}/> Authorised staff</span></div><div className="admin-layout"><aside className="admin-nav">{([{id:"overview",label:"Overview",icon:LayoutDashboard},{id:"hero",label:"Storefront hero",icon:ImageIcon},{id:"products",label:"Products",icon:Shirt},{id:"collections",label:"Collections",icon:Layers3},{id:"orders",label:"Orders",icon:Package},{id:"settings",label:"Store setup",icon:Settings}] as const).map(item => <button key={item.id} className={adminTab === item.id ? "selected" : ""} onClick={() => setAdminTab(item.id)}><item.icon size={17}/>{item.label}</button>)}</aside><div className="admin-content">
        {adminTab === "overview" && <><div className="admin-welcome"><p className="eyebrow">STORE STATUS</p><h2>Built on the right foundations.</h2><p>Product and collection management are connected to Supabase. Payments and fulfilment remain disabled until their providers are configured and verified.</p></div><div className="admin-metrics"><div><span>Published products</span><strong>{products.length}</strong></div><div><span>Collections</span><strong>{collections.length}</strong></div><div><span>Items in active bag sessions</span><strong>—</strong><small>Not an order metric</small></div></div><div className="admin-callout"><CreditCard size={19}/><div><strong>Payments not configured</strong><p>Do not accept live orders until server-side checkout, provider credentials, webhook verification and reconciliation are implemented.</p></div></div><button className="button-dark" onClick={() => { setAdminTab("products"); startProduct(); }}><Plus size={16}/> Add a product</button></>}
        {adminTab === "hero" && <section className="hero-admin-panel"><div className="admin-section-title"><div><h2>Storefront hero</h2><p>Manage campaign media and the brand message on the public homepage.</p></div><span className={heroPublished ? "hero-status-published" : "hero-status-draft"}>{heroPublished ? "Published version active" : "Using default hero"}</span></div><div className="hero-admin-grid"><form className="admin-form hero-config-form" onSubmit={e=>{e.preventDefault();void saveHeroDraft();}}><label>First headline line<input required maxLength={40} value={heroDraft.headlineFirst} onChange={e=>setHeroDraft(v=>({...v,headlineFirst:e.target.value}))}/></label><label>Second headline line<input required maxLength={50} value={heroDraft.headlineSecond} onChange={e=>setHeroDraft(v=>({...v,headlineSecond:e.target.value}))}/></label><label>Supporting copy<textarea required rows={4} maxLength={500} value={heroDraft.supportingText} onChange={e=>setHeroDraft(v=>({...v,supportingText:e.target.value}))}/></label><div className="form-two"><label>Primary CTA label<input required maxLength={50} value={heroDraft.primaryLabel} onChange={e=>setHeroDraft(v=>({...v,primaryLabel:e.target.value}))}/></label><label>Primary destination<select value={heroDraft.primaryDestination} onChange={e=>setHeroDraft(v=>({...v,primaryDestination:e.target.value as HeroConfig["primaryDestination"]}))}><option value="shop">Shop / collection</option><option value="collections">All collections</option></select></label></div><div className="form-two"><label>Secondary CTA label<input required maxLength={50} value={heroDraft.secondaryLabel} onChange={e=>setHeroDraft(v=>({...v,secondaryLabel:e.target.value}))}/></label><label>Secondary destination<select value={heroDraft.secondaryDestination} onChange={e=>setHeroDraft(v=>({...v,secondaryDestination:e.target.value as HeroConfig["secondaryDestination"]}))}><option value="story">DAWG mindset</option><option value="collections">All collections</option></select></label></div><label>Media description / alt text<input maxLength={250} value={heroDraft.mediaAlt} onChange={e=>setHeroDraft(v=>({...v,mediaAlt:e.target.value}))} placeholder="Describe the campaign image or film"/></label><label>Image focal position<select value={heroDraft.objectPosition} onChange={e=>setHeroDraft(v=>({...v,objectPosition:e.target.value}))}><option value="center center">Centre</option><option value="center top">Top centre</option><option value="center bottom">Bottom centre</option><option value="left center">Left</option><option value="right center">Right</option></select></label><div className="hero-upload-field"><label htmlFor="hero-media-upload">Campaign image or video</label><p className="field-hint">JPEG, PNG, WebP, AVIF, MP4 or WebM · maximum 50 MB.</p><input id="hero-media-upload" type="file" accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm" onChange={e=>void uploadHeroMedia(e.target.files?.[0])} disabled={!supabase||heroUploading}/>{heroUploading&&<span className="field-hint">Uploading to private draft storage…</span>}</div>{heroDraft.mediaType==="video"&&<div className="hero-upload-field"><label htmlFor="hero-poster-upload">Video poster / fallback image</label><input id="hero-poster-upload" type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={e=>void uploadHeroPoster(e.target.files?.[0])} disabled={!supabase||heroUploading}/><span className="field-hint">Optional · images up to 12 MB.</span></div>}<div className="hero-admin-actions"><button className="button-outline-dark" type="submit" disabled={heroBusy||heroUploading}><Save size={15}/>{heroBusy?"Saving…":"Save draft"}</button><button className="button-dark" type="button" onClick={()=>void publishHero()} disabled={heroBusy||heroUploading}><Eye size={15}/>{heroBusy?"Publishing…":"Publish hero"}</button></div><p className="field-hint">Draft media stays private. Publishing copies selected media to the public campaign bucket and updates the public configuration only after upload succeeds.</p></form><aside className="hero-admin-preview"><p className="eyebrow">LIVE PREVIEW</p><div className="hero-preview-frame">{heroPreviewUrl&&heroDraft.mediaType==="image"?<img src={heroPreviewUrl} alt={heroDraft.mediaAlt||"Campaign preview"} style={{objectPosition:heroDraft.objectPosition}}/>:heroPreviewUrl&&heroDraft.mediaType==="video"?<video src={heroPreviewUrl} muted controls playsInline poster={heroPosterUrl||undefined}/>:<div className="hero-preview-fallback"><span>DAWG</span><strong>{heroDraft.headlineFirst}<br/>{heroDraft.headlineSecond}</strong></div>}<span className="hero-preview-scrim"/><div className="hero-preview-copy"><strong>{heroDraft.headlineFirst}<br/>{heroDraft.headlineSecond}</strong><small>{heroDraft.supportingText}</small></div></div><p className="field-hint">Preview reflects the draft. The public storefront changes only after Publish hero succeeds.</p></aside></div></section>}
        {adminTab === "products" && <><div className="admin-section-title"><div><h2>Products</h2><p>Drafts stay private; only active, published products appear in the shop.</p></div><button className="button-dark" onClick={() => startProduct()}><Plus size={15}/> Add product</button></div>{products.length ? <div className="admin-table">{products.map(p => <div className="admin-product-row" key={p.id}><div className="admin-product-thumb">{p.image_url ? <img src={p.image_url} alt=""/> : <span>D.</span>}</div><div className="admin-product-meta"><strong>{p.name}</strong><small>{p.sku || "No SKU"} · {p.status}</small></div><strong>{money(p.price_cents, p.currency)}</strong><button className="button-outline-dark small-button" onClick={() => startProduct(p)}>Edit</button></div>)}</div> : <div className="admin-empty"><Shirt size={24}/><h3>Your catalogue starts here.</h3><p>No published products are available. Create a draft, add real product information, then publish when ready.</p><button className="button-dark" onClick={() => startProduct()}><Plus size={15}/> Create product</button></div>}</>}
        {adminTab === "collections" && <><div className="admin-section-title"><div><h2>Collections</h2><p>Organise the DAWG identity into discoverable collections.</p></div><button className="button-dark" onClick={() => setCollectionEditor(true)}><Plus size={15}/> Add collection</button></div><div className="admin-table">{collections.length ? collections.map(c => <div className="admin-collection-row" key={c.id}><span className="collection-mini-mark">{c.name.slice(0,1)}</span><div><strong>{c.name}</strong><small>{c.slug} · {c.status}</small></div><span>{c.description || "No description"}</span></div>) : <div className="admin-empty"><Layers3 size={24}/><h3>No collections in the database.</h3><p>The five DAWG collection concepts appear on the storefront; add database collections here to assign products to them.</p><button className="button-dark" onClick={() => setCollectionEditor(true)}><Plus size={15}/> Add collection</button></div>}</div></>}
        {adminTab === "orders" && <div className="admin-empty"><Package size={24}/><h3>Order processing is not enabled.</h3><p>Order management will become operational once a secure server-side checkout and verified payment lifecycle are implemented. No fake orders are displayed.</p></div>}
        {adminTab === "settings" && <><div className="admin-section-title"><div><h2>Store setup</h2><p>Integration status based on the current application configuration.</p></div></div><div className="settings-list"><div><span><Layers3 size={18}/></span><div><strong>Supabase catalogue</strong><small>Client configured: {supabaseConfigured ? "Yes" : "No"}</small></div><b className={supabaseConfigured ? "setting-good" : "setting-warn"}>{supabaseConfigured ? "Configured" : "Needs setup"}</b></div><div><span><CreditCard size={18}/></span><div><strong>Payment provider</strong><small>Sandbox credentials and verified server callback not detected.</small></div><b className="setting-warn">Not configured</b></div><div><span><Truck size={18}/></span><div><strong>Shipping and fulfilment</strong><small>Rates, zones, and production provider need setup.</small></div><b className="setting-warn">Not configured</b></div><div><span><ShieldCheck size={18}/></span><div><strong>Staff permissions</strong><small>Access is checked against the staff_roles table.</small></div><b className={isAdmin ? "setting-good" : "setting-warn"}>{isAdmin ? "Verified for session" : "No admin role"}</b></div></div></>}
      </div></div></> : <div className="admin-denied"><ShieldCheck size={30}/><p className="eyebrow">RESTRICTED AREA</p><h1>Authorised people<br/><em>only.</em></h1><p>This portal requires a signed-in account with an explicitly assigned DAWG staff role. A customer account alone does not grant access.</p><button className="button-dark" onClick={() => session ? go("account") : openAuth("signin")}>{session ? "Return to account" : "Sign in"} <ArrowRight size={15}/></button><p className="admin-setup-note">Initial owner access must be granted securely in Supabase after the owner account is created.</p></div>}</section>}
    </main>

    <footer className="store-footer"><div className="footer-main"><div className="footer-brand"><a className="wordmark" href="#/home">DAWG<span>®</span></a><p>Success is earned &amp; not given.</p><small>Drive. Ambition. Work. Growth.</small></div><div className="footer-links"><div><strong>THE STORE</strong><button onClick={() => go("shop")}>Shop all</button><button onClick={() => go("collections")}>Collections</button><button onClick={() => go("bag")}>Your bag</button></div><div><strong>THE BRAND</strong><button onClick={() => go("story")}>The mindset</button><button onClick={() => openAuth("signup")}>Create account</button><button onClick={() => go("admin")}>Store administration</button></div><div><strong>HELP &amp; INFORMATION</strong><span>Shipping information to be configured</span><span>Returns policy to be configured</span><span>Contact details to be configured</span></div></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} DAWG CLOTHING</span><span>SUCCESS IS EARNED &amp; NOT GIVEN.</span><button onClick={() => go("admin")}>STAFF ACCESS <ArrowUpRight size={12}/></button></div></footer>

    {authOpen && <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setAuthOpen(false); }}><section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title"><button className="modal-close" onClick={() => setAuthOpen(false)} aria-label="Close"><X size={19}/></button><span className="modal-monogram">D.</span><p className="eyebrow">WELCOME TO DAWG</p><h2 id="auth-title">{authMode === "signup" ? "Create your account." : authMode === "reset" ? "Reset your password." : "Welcome back."}</h2><p className="modal-description">{authMode === "signup" ? "Your next chapter starts with a decision." : authMode === "reset" ? "We'll send a reset link if your account exists." : "Sign in to continue your journey."}</p><form onSubmit={handleAuth}>{authMode === "signup" && <label>Full name<input required value={fullName} onChange={e => setFullName(e.target.value)} autoComplete="name" maxLength={100}/></label>}<label>Email address<input required type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email"/></label>{authMode !== "reset" && <label>Password<input required type="password" minLength={8} value={password} onChange={e => setPassword(e.target.value)} autoComplete={authMode === "signup" ? "new-password" : "current-password"}/></label>}<button className="button-dark auth-submit" disabled={busy}>{busy ? "Please wait…" : authMode === "signup" ? "Create account" : authMode === "reset" ? "Send reset link" : "Sign in"} <ArrowRight size={15}/></button></form><div className="auth-switch">{authMode === "signin" ? <><button onClick={() => setAuthMode("signup")}>Create an account</button><button onClick={() => setAuthMode("reset")}>Forgot password?</button></> : <button onClick={() => setAuthMode("signin")}>Back to sign in</button>}</div>{!supabaseConfigured && <p className="setup-warning">Supabase credentials are not configured in this deployment. Account actions are unavailable.</p>}</section></div>}

    {productEditor && <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setProductEditor(false); }}><section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="product-editor-title"><div className="admin-modal-heading"><div><p className="eyebrow">CATALOGUE MANAGEMENT</p><h2 id="product-editor-title">{editingProduct ? "Edit product" : "Create product"}</h2></div><button className="modal-close inline-close" onClick={() => setProductEditor(false)} aria-label="Close"><X size={19}/></button></div><form onSubmit={saveProduct} className="admin-form"><label>Product name<input required value={productName} onChange={e => setProductName(e.target.value)} maxLength={140}/></label><label>Description<textarea rows={4} value={productDescription} onChange={e => setProductDescription(e.target.value)} maxLength={5000}/></label><div className="form-two"><label>Price (ZAR)<input required type="number" min="0" step="0.01" value={productPrice} onChange={e => setProductPrice(e.target.value)}/></label><label>SKU<input value={productSku} onChange={e => setProductSku(e.target.value)} maxLength={100}/></label></div><div className="form-two"><label>Collection<select value={productCollection} onChange={e => setProductCollection(e.target.value)}><option value="">No collection</option>{collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Shop audience<select value={productGender} onChange={e => setProductGender(e.target.value as "men" | "women" | "unisex")}><option value="men">Men</option><option value="women">Women</option><option value="unisex">Unisex</option></select></label></div><label>Product image<input type="url" placeholder="https://…" value={productImage} onChange={e => setProductImage(e.target.value)}/><span className="field-hint">Or upload a product image (max 8 MB).</span><input type="file" accept="image/*" onChange={e => void uploadProductImage(e.target.files?.[0])} disabled={!supabase || uploading}/>{uploading && <span className="field-hint">Uploading image…</span>}{productImage && <img className="upload-preview" src={productImage} alt="Product preview"/>}</label><div className="form-three"><label>Variant size (optional)<input placeholder="Leave blank for no size option" value={productSize} onChange={e => setProductSize(e.target.value)} maxLength={40}/></label><label>Variant colour (optional)<input placeholder="Leave blank for no colour option" value={productColour} onChange={e => setProductColour(e.target.value)} maxLength={40}/></label><label>Stock<input type="number" min="0" step="1" value={productStock} onChange={e => setProductStock(e.target.value)}/></label></div><label>Publication status<select value={productStatus} onChange={e => setProductStatus(e.target.value as "draft" | "active")}><option value="draft">Draft — not public</option><option value="active">Publish product</option></select></label><p className="field-hint">Only publish products with confirmed prices, real imagery, accurate sizing and a fulfilment plan. Payment collection is not enabled yet.</p><div className="admin-form-actions"><button type="button" className="button-outline-dark" onClick={() => setProductEditor(false)}>Cancel</button><button className="button-dark" disabled={busy || uploading}>{busy ? "Saving…" : "Save product"} <Check size={15}/></button></div></form></section></div>}

    {collectionEditor && <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setCollectionEditor(false); }}><section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="collection-editor-title"><div className="admin-modal-heading"><div><p className="eyebrow">COLLECTION MANAGEMENT</p><h2 id="collection-editor-title">Add collection</h2></div><button className="modal-close inline-close" onClick={() => setCollectionEditor(false)} aria-label="Close"><X size={19}/></button></div><form className="admin-form" onSubmit={saveCollection}><label>Collection name<input required value={collectionName} onChange={e => setCollectionName(e.target.value)} maxLength={100}/></label><label>Slug<input placeholder="generated-from-name" value={collectionSlug} onChange={e => setCollectionSlug(e.target.value)} maxLength={120}/></label><label>Description<textarea rows={3} value={collectionDescription} onChange={e => setCollectionDescription(e.target.value)} maxLength={2000}/></label><label>Status<select value={collectionStatus} onChange={e => setCollectionStatus(e.target.value as "draft" | "active")}><option value="draft">Draft</option><option value="active">Active</option></select></label><div className="admin-form-actions"><button type="button" className="button-outline-dark" onClick={() => setCollectionEditor(false)}>Cancel</button><button className="button-dark" disabled={busy}>Save collection <Check size={15}/></button></div></form></section></div>}

    <div className="floating-help"><span>DAWG CLOTHING</span><span>THE WORK SPEAKS.</span></div>
  </div>;
}

function ProductGrid({ products, onOpen }: { products: Product[]; onOpen: (p: Product) => void }) {
  return <div className="product-grid">{products.map((p, i) => <article className="product-card" key={p.id}><button className="product-card-image" onClick={() => onOpen(p)} aria-label={`View ${p.name}`}>{p.image_url ? <img loading="lazy" src={p.image_url} alt={p.name}/> : <div className={`product-placeholder product-tone-${i % 4}`}><span>DAWG</span><small>{p.collections?.name || "CLOTHING"}</small></div>}<span className="product-view">View piece <ArrowUpRight size={14}/></span></button><div className="product-card-info"><div><p className="product-category">{p.collections?.name || "DAWG CLOTHING"}</p><button className="product-title" onClick={() => onOpen(p)}>{p.name}</button><span className="product-price">{money(p.price_cents, p.currency)}</span></div><button className="quick-add" aria-label={`View ${p.name} options`} onClick={() => onOpen(p)}><Plus size={17}/></button></div></article>)}</div>;
}
function VariantPicker({ product, onAdd }: { product: Product; onAdd: (v?: Variant) => void }) {
  const variants = (product.product_variants || []).filter(v => v.status === "active");
  const [selected, setSelected] = useState(variants[0]?.id || "");
  const variant = variants.find(v => v.id === selected) || variants[0];
  const hasVariants = product.has_variants;
  const unavailable = !variant || (variant.available !== undefined ? !variant.available : variant.track_inventory && variant.stock_on_hand < 1);
  return <div className="variant-picker">{hasVariants ? (variants.length > 0 ? <><label>Size / colour<select value={variant?.id || selected} onChange={e => setSelected(e.target.value)}>{variants.map(v => <option key={v.id} value={v.id} disabled={v.track_inventory && v.stock_on_hand < 1}>{[v.size, v.colour].filter(Boolean).join(" / ") || "Standard"}{v.track_inventory && v.stock_on_hand < 1 ? " — Sold out" : ""}</option>)}</select></label><p className="variant-stock">{variant?.available !== undefined ? (variant.available ? "Available" : "Sold out") : variant?.track_inventory ? (variant.stock_on_hand > 0 ? "Available" : "Sold out") : "Availability confirmed at checkout"}</p></> : <p className="variant-stock">No available variants. Please contact the store team.</p>) : <p className="variant-stock">{variant ? (variant.available !== undefined ? (variant.available ? "Available" : "Sold out") : variant.stock_on_hand > 0 ? "Available" : "Sold out") : "Unavailable"}</p>}<button className="button-dark add-to-bag" disabled={unavailable} onClick={() => onAdd(variant)}>{unavailable ? "Sold out" : "Add to bag"} <ShoppingBag size={16}/></button><p className="detail-note"><Truck size={16}/> Shipping and returns information will be published before launch.</p></div>;
}
