import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Variant = {
  id: string;
  name: string;
  price_delta_cents: number;
  member_price_delta_cents: number;
  inventory_quantity: number | null;
  attributes: Record<string, unknown>;
  is_active: boolean;
};

type Product = {
  id: string;
  product_key: string;
  name: string;
  product_type: string;
  description: string | null;
  base_price_cents: number;
  member_price_cents: number | null;
  currency: string;
  image_asset_key: string | null;
  track_inventory: boolean;
  inventory_quantity: number | null;
  allow_backorder: boolean;
  is_featured: boolean;
  product_variants: Variant[] | null;
};

type Membership = {
  plan_key: string | null;
  plan_name: string | null;
  subscription_status: string | null;
};

type CartLine = {
  productId: string;
  variantId: string | null;
  quantity: number;
};

type CheckoutReadiness = {
  provider_configured: boolean;
  provider_status: string;
  health_status: string;
  message: string;
};

type CheckoutResult = {
  checkout_session_id: string;
  order_id: string;
  order_number: number;
  subtotal_cents: number;
  discount_cents: number;
  total_cents: number;
  currency: string;
  expires_at: string;
};

function money(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency
  }).format(cents / 100);
}

function productImage(assetKey: string | null) {
  if (!assetKey) return "https://dustincourageous.com/assets/images/dc-shield.jpeg";
  if (assetKey.startsWith("http")) return assetKey;
  return "https://dustincourageous.com/assets/images/" + assetKey;
}

export function FamilyStore({ householdId }: { householdId: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [promoCode, setPromoCode] = useState("");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [checkoutSummary, setCheckoutSummary] = useState<CheckoutResult | null>(null);
  const [checkoutReadiness, setCheckoutReadiness] = useState<CheckoutReadiness | null>(null);

  const load = useCallback(async () => {
    setMessage("");

    const [productResult, membershipResult, readinessResult] = await Promise.all([
      supabase
        .from("products")
        .select("id,product_key,name,product_type,description,base_price_cents,member_price_cents,currency,image_asset_key,track_inventory,inventory_quantity,allow_backorder,is_featured,product_variants(id,name,price_delta_cents,member_price_delta_cents,inventory_quantity,attributes,is_active)")
        .eq("status", "active")
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: true }),
      supabase
        .from("household_membership_summary")
        .select("plan_key,plan_name,subscription_status")
        .eq("household_id", householdId)
        .maybeSingle(),
      supabase.rpc("get_checkout_readiness")
    ]);

    const error = productResult.error || membershipResult.error || readinessResult.error;
    if (error) {
      setMessage(error.message);
      return;
    }

    const nextProducts = ((productResult.data ?? []) as Product[]).map((product) => ({
      ...product,
      product_variants: (product.product_variants ?? [])
        .filter((variant) => variant.is_active)
    }));

    setProducts(nextProducts);
    setMembership((membershipResult.data ?? null) as Membership | null);
    setCheckoutReadiness(((readinessResult.data ?? [])[0] ?? null) as CheckoutReadiness | null);

    setSelectedVariants((current) => {
      const next = { ...current };
      for (const product of nextProducts) {
        if (!next[product.id] && product.product_variants?.length) {
          next[product.id] = product.product_variants[0].id;
        }
      }
      return next;
    });
  }, [householdId]);

  useEffect(() => {
    void load();
  }, [load]);

  const isPaidMember =
    membership?.subscription_status &&
    ["trialing", "active", "comped"].includes(membership.subscription_status) &&
    membership.plan_key &&
    membership.plan_key !== "free";

  function displayUnitPrice(product: Product, variantId: string | null) {
    const variant = variantId
      ? product.product_variants?.find((item) => item.id === variantId)
      : null;

    const productPrice =
      isPaidMember && product.member_price_cents !== null
        ? product.member_price_cents
        : product.base_price_cents;

    const variantDelta = variant
      ? isPaidMember
        ? variant.member_price_delta_cents
        : variant.price_delta_cents
      : 0;

    return Math.max(0, productPrice + variantDelta);
  }

  function addToCart(product: Product) {
    const variantId = product.product_variants?.length
      ? selectedVariants[product.id] ?? product.product_variants[0].id
      : null;

    setCheckoutSummary(null);
    setMessage("");
    setCart((current) => {
      const existingIndex = current.findIndex(
        (line) => line.productId === product.id && line.variantId === variantId
      );

      if (existingIndex >= 0) {
        return current.map((line, index) =>
          index === existingIndex
            ? { ...line, quantity: Math.min(20, line.quantity + 1) }
            : line
        );
      }

      return [...current, { productId: product.id, variantId, quantity: 1 }];
    });
  }

  function updateQuantity(index: number, quantity: number) {
    setCheckoutSummary(null);
    if (quantity <= 0) {
      setCart((current) => current.filter((_, lineIndex) => lineIndex !== index));
      return;
    }

    setCart((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index
          ? { ...line, quantity: Math.max(1, Math.min(20, quantity)) }
          : line
      )
    );
  }

  const cartPreview = useMemo(
    () =>
      cart.map((line) => {
        const product = products.find((item) => item.id === line.productId);
        const variant = product?.product_variants?.find(
          (item) => item.id === line.variantId
        );

        return {
          line,
          product,
          variant,
          unitPrice: product ? displayUnitPrice(product, line.variantId) : 0
        };
      }),
    [cart, products, isPaidMember]
  );

  const previewSubtotal = cartPreview.reduce(
    (sum, item) => sum + item.unitPrice * item.line.quantity,
    0
  );

  async function checkout() {
    if (!cart.length) return;

    if (!checkoutReadiness?.provider_configured) {
      setMessage(checkoutReadiness?.message || "Online checkout is not connected yet.");
      return;
    }

    setWorking(true);
    setMessage("");
    setCheckoutSummary(null);

    const { data: checkoutRows, error: checkoutError } = await supabase.rpc(
      "create_checkout_order",
      {
        p_household_id: householdId,
        p_items: cart.map((line) => ({
          product_id: line.productId,
          variant_id: line.variantId,
          quantity: line.quantity
        })),
        p_promo_code: promoCode.trim() || undefined
      }
    );

    if (checkoutError) {
      setWorking(false);
      setMessage(checkoutError.message);
      return;
    }

    const summary = (checkoutRows ?? [])[0] as CheckoutResult | undefined;

    if (!summary) {
      setWorking(false);
      setMessage("Adventure Club could not create this checkout.");
      return;
    }

    setCheckoutSummary(summary);

    const { data: functionData, error: functionError } =
      await supabase.functions.invoke("commerce-checkout", {
        body: { checkout_session_id: summary.checkout_session_id }
      });

    if (functionError || functionData?.error) {
      await supabase.rpc("cancel_checkout_session", {
        p_checkout_session_id: summary.checkout_session_id
      });

      setWorking(false);

      if (functionData?.code === "provider_not_configured") {
        setMessage(
          "The Dustin Courageous store is ready, but live payment processing has not been activated yet. No charge occurred and the temporary inventory reservation was released."
        );
      } else {
        setMessage(
          functionData?.error ||
            functionError?.message ||
            "Checkout could not be started. No charge occurred."
        );
      }
      return;
    }

    const checkoutUrl =
      typeof functionData?.checkout_url === "string"
        ? functionData.checkout_url
        : "";

    if (!checkoutUrl) {
      await supabase.rpc("cancel_checkout_session", {
        p_checkout_session_id: summary.checkout_session_id
      });
      setWorking(false);
      setMessage("The payment provider did not return a checkout page. No charge occurred.");
      return;
    }

    window.location.assign(checkoutUrl);
  }

  return (
    <div className="family-store">
      <section className="family-store-hero">
        <div>
          <p className="eyebrow gold">Courageous Kids Store</p>
          <h1>Books, gear & adventure extras</h1>
          <p>
            Only DC Governance-approved products appear here. Member pricing, promo codes,
            inventory, and digital unlocks are calculated by the Dustin backend.
          </p>
        </div>
        <div className="store-member-chip">
          <span>{isPaidMember ? "Member pricing" : "Household access"}</span>
          <strong>{membership?.plan_name || "Adventure Club Free"}</strong>
        </div>
      </section>

      {message && <div className="form-message">{message}</div>}

      <div className="family-store-layout">
        <section className="store-catalog">
          <div className="section-heading">
            <div>
              <p className="eyebrow red">Shop</p>
              <h2>Adventure Club products</h2>
            </div>
            <span className="pill">{products.length} available</span>
          </div>

          {products.length ? (
            <div className="store-product-grid">
              {products.map((product) => {
                const variants = product.product_variants ?? [];
                const variantId = variants.length
                  ? selectedVariants[product.id] ?? variants[0].id
                  : null;
                const variant = variants.find((item) => item.id === variantId);
                const unitPrice = displayUnitPrice(product, variantId);
                const regularPrice =
                  product.base_price_cents + (variant?.price_delta_cents ?? 0);
                const soldOut =
                  variant
                    ? variant.inventory_quantity === 0 && !product.allow_backorder
                    : product.inventory_quantity === 0 && !product.allow_backorder;

                return (
                  <article className="store-product-card" key={product.id}>
                    <div className="store-product-image">
                      <img src={productImage(product.image_asset_key)} alt={product.name} />
                      {product.is_featured && <span>Featured</span>}
                    </div>

                    <div className="store-product-copy">
                      <span>{product.product_type.replaceAll("_", " ")}</span>
                      <h3>{product.name}</h3>
                      <p>{product.description}</p>

                      {variants.length > 0 && (
                        <label>
                          Option
                          <select
                            value={variantId ?? ""}
                            onChange={(event) =>
                              setSelectedVariants((current) => ({
                                ...current,
                                [product.id]: event.target.value
                              }))
                            }
                          >
                            {variants.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}

                      <div className="store-price-row">
                        <div>
                          <strong>{money(unitPrice, product.currency)}</strong>
                          {isPaidMember && unitPrice < regularPrice && (
                            <small>{money(regularPrice, product.currency)} regular</small>
                          )}
                        </div>
                        <button
                          className="secondary-button"
                          type="button"
                          disabled={soldOut}
                          onClick={() => addToCart(product)}
                        >
                          {soldOut ? "Sold out" : "Add to cart"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">◆</div>
              <h3>The store catalog is being prepared.</h3>
              <p>
                Products will appear only after their DC brand review is approved and they are
                activated through Governance.
              </p>
            </div>
          )}
        </section>

        <aside className="store-cart">
          <div className="section-heading compact-heading">
            <div>
              <p className="eyebrow gold">Cart</p>
              <h2>Your order</h2>
            </div>
            <span className="pill">
              {cart.reduce((sum, line) => sum + line.quantity, 0)} items
            </span>
          </div>

          {cartPreview.length ? (
            <>
              <div className="store-cart-lines">
                {cartPreview.map((item, index) => (
                  <article
                    key={item.line.productId + ":" + String(item.line.variantId)}
                  >
                    <div>
                      <strong>{item.product?.name || "Product"}</strong>
                      {item.variant && <small>{item.variant.name}</small>}
                      <span>{money(item.unitPrice)} each</span>
                    </div>

                    <div className="store-quantity">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(index, item.line.quantity - 1)
                        }
                      >
                        −
                      </button>
                      <strong>{item.line.quantity}</strong>
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(index, item.line.quantity + 1)
                        }
                      >
                        +
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              <label className="store-promo">
                Promo code <span className="optional">(optional)</span>
                <input
                  value={promoCode}
                  onChange={(event) =>
                    setPromoCode(event.target.value.toUpperCase().trim())
                  }
                  placeholder="CODE"
                />
              </label>

              <div className="store-total-preview">
                <span>Estimated merchandise subtotal</span>
                <strong>{money(previewSubtotal)}</strong>
                <small>
                  Final member pricing, promo discount, inventory, tax, and shipping are
                  validated server-side before payment.
                </small>
              </div>

              {checkoutSummary && (
                <div className="store-server-total">
                  <span>Server-validated total</span>
                  <strong>
                    {money(checkoutSummary.total_cents, checkoutSummary.currency)}
                  </strong>
                  {checkoutSummary.discount_cents > 0 && (
                    <small>
                      Includes {money(checkoutSummary.discount_cents)} discount
                    </small>
                  )}
                </div>
              )}

              <button
                className="primary-button store-checkout-button"
                type="button"
                disabled={working || !checkoutReadiness?.provider_configured}
                onClick={() => void checkout()}
              >
                {working
                  ? "Preparing secure checkout..."
                  : checkoutReadiness?.provider_configured
                    ? "Continue to secure checkout"
                    : "Checkout coming soon"}
              </button>

              {!checkoutReadiness?.provider_configured && (
                <p className="store-provider-note">
                  The catalog and cart are ready. Live payment stays disabled until the approved hosted checkout provider is connected.
                </p>
              )}

              <p className="privacy-note">
                Adventure Club does not collect or store your card number or CVV. Payment is
                completed only through the configured hosted payment provider.
              </p>
            </>
          ) : (
            <p className="muted">Your cart is empty.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
