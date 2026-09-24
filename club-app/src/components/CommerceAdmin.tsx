import { FormEvent, useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Product = {
  id: string;
  product_key: string;
  sku: string | null;
  name: string;
  product_type: string;
  status: string;
  base_price_cents: number;
  member_price_cents: number | null;
  inventory_quantity: number | null;
  track_inventory: boolean;
};

type Order = {
  id: string;
  order_number: number;
  status: string;
  total_cents: number;
  currency: string;
  billing_email: string | null;
  created_at: string;
};

type Book = {
  id: string;
  book_number: number | null;
  title: string;
};

type Entitlement = {
  entitlement_key: string;
  name: string;
};

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
}

function money(cents:number|null|undefined){
  return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format((cents??0)/100);
}

export function CommerceAdmin({ canOperate }: { canOperate: boolean }) {
  const [products,setProducts]=useState<Product[]>([]);
  const [orders,setOrders]=useState<Order[]>([]);
  const [books,setBooks]=useState<Book[]>([]);
  const [entitlements,setEntitlements]=useState<Entitlement[]>([]);
  const [message,setMessage]=useState("");
  const [working,setWorking]=useState(false);

  const [name,setName]=useState("");
  const [productKey,setProductKey]=useState("");
  const [sku,setSku]=useState("");
  const [productType,setProductType]=useState("book");
  const [description,setDescription]=useState("");
  const [price,setPrice]=useState("");
  const [memberPrice,setMemberPrice]=useState("");
  const [inventory,setInventory]=useState("");
  const [status,setStatus]=useState("draft");

  const [mappingProductId,setMappingProductId]=useState("");
  const [mappingBookId,setMappingBookId]=useState("");
  const [mappingEntitlement,setMappingEntitlement]=useState("");

  const [promoCode,setPromoCode]=useState("");
  const [promoDescription,setPromoDescription]=useState("");
  const [promoType,setPromoType]=useState("percent");
  const [promoValue,setPromoValue]=useState("");

  const load=useCallback(async()=>{
    setMessage("");
    const [productResult,orderResult,bookResult,entitlementResult]=await Promise.all([
      supabase.from("products").select("id,product_key,sku,name,product_type,status,base_price_cents,member_price_cents,inventory_quantity,track_inventory").order("created_at",{ascending:false}),
      supabase.from("orders").select("id,order_number,status,total_cents,currency,billing_email,created_at").order("created_at",{ascending:false}).limit(100),
      supabase.from("books").select("id,book_number,title").order("book_number",{ascending:true}),
      supabase.from("entitlement_definitions").select("entitlement_key,name").eq("is_active",true).order("name")
    ]);

    const error=productResult.error||orderResult.error||bookResult.error||entitlementResult.error;
    if(error){
      setMessage(error.message);
      return;
    }

    const nextProducts=(productResult.data??[]) as Product[];
    const nextBooks=(bookResult.data??[]) as Book[];
    const nextEntitlements=(entitlementResult.data??[]) as Entitlement[];

    setProducts(nextProducts);
    setOrders((orderResult.data??[]) as Order[]);
    setBooks(nextBooks);
    setEntitlements(nextEntitlements);

    if(!mappingProductId&&nextProducts[0]) setMappingProductId(nextProducts[0].id);
    if(!mappingBookId&&nextBooks[0]) setMappingBookId(nextBooks[0].id);
    if(!mappingEntitlement&&nextEntitlements[0]) setMappingEntitlement(nextEntitlements[0].entitlement_key);
  },[mappingProductId,mappingBookId,mappingEntitlement]);

  useEffect(()=>{void load();},[load]);

  async function createProduct(event:FormEvent){
    event.preventDefault();
    setWorking(true);
    setMessage("");

    const priceCents=Math.round((Number(price)||0)*100);
    const memberCents=memberPrice.trim()===""?undefined:Math.round((Number(memberPrice)||0)*100);

    const {data,error}=await supabase.rpc("admin_create_product",{
      p_product_key:productKey||slugify(name),
      p_name:name.trim(),
      p_product_type:productType,
      p_description:description.trim()||undefined,
      p_sku:sku.trim()||undefined,
      p_base_price_cents:priceCents,
      p_member_price_cents:memberCents,
      p_status:status,
      p_track_inventory:true,
      p_inventory_quantity:inventory.trim()===""?undefined:Number(inventory),
      p_allow_backorder:false,
      p_is_featured:false
    });

    setWorking(false);
    if(error){
      setMessage(error.message);
      return;
    }

    setName("");setProductKey("");setSku("");setDescription("");setPrice("");setMemberPrice("");setInventory("");
    setMessage("Product created.");
    await load();
    if(typeof data==="string") setMappingProductId(data);
  }

  async function mapBook(){
    if(!mappingProductId||!mappingBookId)return;
    setWorking(true);setMessage("");
    const {error}=await supabase.from("product_book_access_rules").upsert({
      product_id:mappingProductId,
      book_id:mappingBookId,
      is_active:true
    },{onConflict:"product_id,book_id"});
    setWorking(false);
    if(error)return setMessage(error.message);
    setMessage("Product now grants book companion access.");
  }

  async function mapEntitlement(){
    if(!mappingProductId||!mappingEntitlement)return;
    setWorking(true);setMessage("");
    const {error}=await supabase.from("product_entitlement_rules").upsert({
      product_id:mappingProductId,
      entitlement_key:mappingEntitlement,
      is_active:true
    },{onConflict:"product_id,entitlement_key"});
    setWorking(false);
    if(error)return setMessage(error.message);
    setMessage("Product now grants the selected entitlement.");
  }

  async function createPromo(event:FormEvent){
    event.preventDefault();
    setWorking(true);setMessage("");

    const raw=Number(promoValue)||0;
    const discountValue=promoType==="percent"?Math.round(raw):Math.round(raw*100);

    const {error}=await supabase.rpc("admin_create_promo_code",{
      p_code:promoCode,
      p_description:promoDescription||"",
      p_discount_type:promoType,
      p_discount_value:discountValue,
      p_minimum_order_cents:0
    });

    setWorking(false);
    if(error)return setMessage(error.message);
    setPromoCode("");setPromoDescription("");setPromoValue("");
    setMessage("Promo code created.");
  }

  async function moveOrder(orderId:string,nextStatus:string){
    setWorking(true);setMessage("");
    const {error}=await supabase.rpc("admin_set_order_status",{
      p_order_id:orderId,
      p_status:nextStatus
    });
    setWorking(false);
    if(error)return setMessage(error.message);
    await load();
  }

  return (
    <div className="commerce-admin">
      {message&&<div className="form-message">{message}</div>}

      <div className="admin-two-column">
        <section className="admin-card">
          <p className="eyebrow red">Store Catalog</p>
          <h2>Create product</h2>
          <form className="admin-form" onSubmit={createProduct}>
            <label>
              Product name
              <input required value={name} onChange={(event)=>{setName(event.target.value);if(!productKey)setProductKey(slugify(event.target.value));}}/>
            </label>
            <label>
              Product key
              <input required value={productKey} onChange={(event)=>setProductKey(slugify(event.target.value))}/>
            </label>
            <label>
              Type
              <select value={productType} onChange={(event)=>setProductType(event.target.value)}>
                <option value="book">Book</option>
                <option value="apparel">Apparel</option>
                <option value="wristband">Wristband</option>
                <option value="sticker">Sticker</option>
                <option value="gift_box">Gift Box</option>
                <option value="kit">Kit</option>
                <option value="digital">Digital</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label>SKU<input value={sku} onChange={(event)=>setSku(event.target.value)}/></label>
            <label>Price ($)<input required type="number" min="0" step="0.01" value={price} onChange={(event)=>setPrice(event.target.value)}/></label>
            <label>Member price ($)<input type="number" min="0" step="0.01" value={memberPrice} onChange={(event)=>setMemberPrice(event.target.value)}/></label>
            <label>Inventory<input type="number" min="0" value={inventory} onChange={(event)=>setInventory(event.target.value)}/></label>
            <label>
              Status
              <select value={status} onChange={(event)=>setStatus(event.target.value)}>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <label className="full">Description<textarea value={description} onChange={(event)=>setDescription(event.target.value)}/></label>
            <button className="primary-button full" disabled={working}>Create product</button>
          </form>
        </section>

        <section className="admin-card">
          <div className="section-heading compact-heading">
            <div><p className="eyebrow gold">Catalog</p><h2>Products</h2></div>
            <span className="pill">{products.length}</span>
          </div>
          <div className="admin-list">
            {products.map((product)=>(
              <article className="admin-list-row" key={product.id}>
                <div>
                  <strong>{product.name}</strong>
                  <small>{product.product_type.replaceAll("_"," ")} · {money(product.base_price_cents)}{product.member_price_cents!==null?" · member "+money(product.member_price_cents):""}</small>
                </div>
                <span className={product.status==="active"?"status-chip done":"status-chip"}>{product.status}</span>
              </article>
            ))}
            {!products.length&&<p className="muted">No products yet. Pricing stays empty until you approve it.</p>}
          </div>
        </section>
      </div>

      <div className="admin-two-column">
        <section className="admin-card">
          <p className="eyebrow red">Digital Unlocks</p>
          <h2>Product access rules</h2>
          <div className="admin-form">
            <label className="full">
              Product
              <select value={mappingProductId} onChange={(event)=>setMappingProductId(event.target.value)}>
                <option value="">Select product</option>
                {products.map((product)=><option key={product.id} value={product.id}>{product.name}</option>)}
              </select>
            </label>
            <label>
              Book access
              <select value={mappingBookId} onChange={(event)=>setMappingBookId(event.target.value)}>
                {books.map((book)=><option key={book.id} value={book.id}>Book #{book.book_number??""} · {book.title}</option>)}
              </select>
            </label>
            <button type="button" className="secondary-button" disabled={!mappingProductId||working} onClick={()=>void mapBook()}>Grant book access</button>
            <label>
              Entitlement
              <select value={mappingEntitlement} onChange={(event)=>setMappingEntitlement(event.target.value)}>
                {entitlements.map((item)=><option key={item.entitlement_key} value={item.entitlement_key}>{item.name}</option>)}
              </select>
            </label>
            <button type="button" className="secondary-button" disabled={!mappingProductId||working} onClick={()=>void mapEntitlement()}>Grant entitlement</button>
          </div>
          <p className="privacy-note">When a future checkout marks an order paid, these rules can unlock the linked digital access automatically.</p>
        </section>

        <section className="admin-card">
          <p className="eyebrow gold">Promotions</p>
          <h2>Create promo code</h2>
          <form className="admin-form" onSubmit={createPromo}>
            <label>Code<input required value={promoCode} onChange={(event)=>setPromoCode(event.target.value.toUpperCase())}/></label>
            <label>
              Type
              <select value={promoType} onChange={(event)=>setPromoType(event.target.value)}>
                <option value="percent">Percent</option>
                <option value="fixed">Fixed dollars</option>
              </select>
            </label>
            <label>Value<input required type="number" min="0.01" step="0.01" value={promoValue} onChange={(event)=>setPromoValue(event.target.value)}/></label>
            <label className="full">Description<textarea value={promoDescription} onChange={(event)=>setPromoDescription(event.target.value)}/></label>
            <button className="secondary-button full" disabled={working}>Create promo</button>
          </form>
        </section>
      </div>

      <section className="admin-card">
        <div className="section-heading compact-heading">
          <div><p className="eyebrow red">Operations</p><h2>Orders</h2></div>
          <span className="pill">{orders.length}</span>
        </div>
        <div className="admin-list">
          {orders.map((order)=>(
            <article className="commerce-order-row" key={order.id}>
              <div>
                <strong>Order #{order.order_number}</strong>
                <small>{order.billing_email||"Household order"} · {new Date(order.created_at).toLocaleDateString()} · {money(order.total_cents)}</small>
              </div>
              <span className="status-chip">{order.status.replaceAll("_"," ")}</span>
              {canOperate&&(
                <select value={order.status} onChange={(event)=>void moveOrder(order.id,event.target.value)}>
                  <option value="pending_payment">Pending payment</option>
                  <option value="paid">Paid</option>
                  <option value="processing">Processing</option>
                  <option value="partially_fulfilled">Partially fulfilled</option>
                  <option value="fulfilled">Fulfilled</option>
                  <option value="canceled">Canceled</option>
                  <option value="refunded">Refunded</option>
                </select>
              )}
            </article>
          ))}
          {!orders.length&&<p className="muted">No orders yet. Checkout/payment provider is intentionally not connected yet.</p>}
        </div>
      </section>
    </div>
  );
}
