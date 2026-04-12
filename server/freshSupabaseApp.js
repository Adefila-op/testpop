
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return;

  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) continue;

    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

[
  path.resolve(process.cwd(), ".env.local"),
  path.resolve(process.cwd(), ".env"),
  path.resolve(__dirname, ".env.local"),
  path.resolve(__dirname, ".env"),
].forEach((envPath) => loadEnvFile(envPath));

const {
  SUPABASE_URL = process.env.VITE_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_SECRET_KEY,
  PORT = "8788",
} = process.env;

const SERVICE_KEY = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SECRET_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Collector-Id"],
  })
);
app.options("*", cors());
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

function nowIso() {
  return new Date().toISOString();
}

function normalizeCollectorId(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "";
  return normalized.replace(/[^a-z0-9-_]/g, "").slice(0, 64);
}

function resolveCollectorId(req) {
  const bodyValue =
    req.body && typeof req.body === "object" && !Array.isArray(req.body)
      ? req.body.collector_id
      : "";
  const queryValue = typeof req.query.collector_id === "string" ? req.query.collector_id : "";
  const headerValue = req.get("x-collector-id") || "";
  const candidate = bodyValue || queryValue || headerValue;
  const normalized = normalizeCollectorId(candidate);
  return normalized || `guest-${randomUUID().slice(0, 8)}`;
}

async function ensureCollectorProfile(collectorId) {
  if (!collectorId) return;
  await supabase
    .from("collector_profiles")
    .upsert({ id: collectorId }, { onConflict: "id" });
}

function normalizeProductType(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (normalized === "digital_art") return "digital_art";
  if (normalized === "ebook") return "ebook";
  if (normalized === "physical") return "physical";
  return "file";
}

function resolveProductRender(product) {
  const type = normalizeProductType(product?.product_type);
  const deliveryMode = String(product?.delivery_mode || "").trim();
  const imageUrl = String(product?.image_url || "").trim();
  const previewUrl = String(product?.preview_url || "").trim();
  const deliveryUrl = String(product?.delivery_url || "").trim();

  if (type === "physical" || deliveryMode === "deliver_physical") {
    return {
      product_type: type,
      render_mode: "delivery",
      image_url: imageUrl || previewUrl || null,
      readable_url: null,
      download_url: null,
    };
  }

  if (type === "digital_art") {
    return {
      product_type: type,
      render_mode: "image",
      image_url: previewUrl || imageUrl,
      readable_url: null,
      download_url: deliveryUrl || previewUrl || imageUrl || null,
    };
  }

  if (type === "ebook") {
    const readable = previewUrl || deliveryUrl || null;
    return {
      product_type: type,
      render_mode: "ebook",
      image_url: imageUrl || null,
      readable_url: readable,
      download_url: deliveryUrl || readable,
    };
  }

  return {
    product_type: type,
    render_mode: "download",
    image_url: imageUrl || previewUrl || null,
    readable_url: null,
    download_url: deliveryUrl || null,
  };
}

function mapFulfillmentMode(items) {
  const modes = new Set(items.map((item) => String(item.delivery_mode || "")));
  if (modes.has("deliver_physical")) return "deliver_physical";
  if (modes.has("collect_onchain")) return "collect_onchain";
  if (modes.has("render_online")) return "render_online";
  return "download_mobile";
}

async function loadCreatorsByIds(ids) {
  if (!ids.length) return {};
  const { data } = await supabase
    .from("creator_profiles")
    .select("id, name, handle, profile_image_url")
    .in("id", ids);
  return (data || []).reduce((acc, creator) => {
    acc[creator.id] = creator;
    return acc;
  }, {});
}

async function loadProductsByIds(ids) {
  if (!ids.length) return {};
  const { data } = await supabase
    .from("creator_products")
    .select("id, creator_id, title, description, image_url, preview_url, delivery_url, price_eth, product_type, delivery_mode")
    .in("id", ids);
  return (data || []).reduce((acc, product) => {
    acc[product.id] = product;
    return acc;
  }, {});
}

async function buildFeedItems(posts, collectorId) {
  const postIds = posts.map((post) => post.id);
  const productIds = posts.map((post) => post.product_id);
  const creatorIds = posts.map((post) => post.creator_id);

  const [productsById, creatorsById] = await Promise.all([
    loadProductsByIds(productIds),
    loadCreatorsByIds(creatorIds),
  ]);

  const { data: likeRows } = await supabase
    .from("discover_post_likes")
    .select("post_id, collector_id")
    .in("post_id", postIds);

  const { data: commentRows } = await supabase
    .from("discover_post_comments")
    .select("post_id")
    .in("post_id", postIds);

  const likeCounts = (likeRows || []).reduce((acc, row) => {
    acc[row.post_id] = (acc[row.post_id] || 0) + 1;
    return acc;
  }, {});

  const commentCounts = (commentRows || []).reduce((acc, row) => {
    acc[row.post_id] = (acc[row.post_id] || 0) + 1;
    return acc;
  }, {});

  const likedPosts = new Set(
    (likeRows || [])
      .filter((row) => row.collector_id === collectorId)
      .map((row) => row.post_id)
  );

  return posts
    .map((post) => {
      const product = productsById[post.product_id];
      const creator = creatorsById[post.creator_id];
      if (!product || !creator) return null;
      const render = resolveProductRender(product);

      return {
        id: post.id,
        post_id: post.id,
        product_id: product.id,
        item_type: "product",
        title: product.title,
        description: post.caption || product.description,
        image_url: render.image_url || product.image_url,
        price_eth: Number(product.price_eth) || 0,
        product_type: render.product_type,
        render_mode: render.render_mode,
        delivery_mode: product.delivery_mode,
        creator_id: creator.id,
        creator_wallet: creator.handle,
        creator_name: creator.name,
        creator_avatar_url: creator.profile_image_url || null,
        can_purchase: true,
        can_bid: false,
        like_count: likeCounts[post.id] || 0,
        comment_count: commentCounts[post.id] || 0,
        liked: likedPosts.has(post.id),
        created_at: post.created_at,
      };
    })
    .filter(Boolean);
}

async function summarizeCart(collectorId) {
  const { data: cartRows } = await supabase
    .from("commerce_carts")
    .select("product_id, quantity")
    .eq("collector_id", collectorId);

  const items = cartRows || [];
  const productIds = items.map((item) => item.product_id);
  const productsById = await loadProductsByIds(productIds);
  const creatorIds = Object.values(productsById).map((product) => product.creator_id);
  const creatorsById = await loadCreatorsByIds(creatorIds);

  const hydrated = items
    .map((entry) => {
      const product = productsById[entry.product_id];
      if (!product) return null;
      const creator = creatorsById[product.creator_id];
      const quantity = Math.max(1, Number(entry.quantity) || 1);
      const unitPriceEth = Number(product.price_eth) || 0;
      const render = resolveProductRender(product);
      return {
        product_id: product.id,
        quantity,
        unit_price_eth: unitPriceEth,
        line_total_eth: Number((unitPriceEth * quantity).toFixed(6)),
        title: product.title,
        image_url: render.image_url || product.image_url,
        product_type: render.product_type,
        render_mode: render.render_mode,
        delivery_mode: product.delivery_mode,
        readable_url: render.readable_url,
        download_url: render.download_url,
        creator_name: creator?.name || "Creator",
        creator_handle: creator?.handle || "",
      };
    })
    .filter(Boolean);

  return {
    collector_id: collectorId,
    items: hydrated,
    total_eth: Number(hydrated.reduce((sum, item) => sum + Number(item.line_total_eth || 0), 0).toFixed(6)),
  };
}
async function mintPoapIfEligible(collectorId) {
  const { data: orders } = await supabase
    .from("commerce_orders")
    .select("id")
    .eq("collector_id", collectorId);
  if ((orders || []).length < 3) return;

  const { data: existing } = await supabase
    .from("collector_poaps")
    .select("id")
    .eq("collector_id", collectorId)
    .eq("code", "supporter-3")
    .maybeSingle();

  if (existing?.id) return;

  await supabase
    .from("collector_poaps")
    .insert({
      collector_id: collectorId,
      code: "supporter-3",
      title: "Supporter Level 3",
      description: "Completed three purchases as a guest collector.",
    });
}

async function grantCollection(collectorId, orderId, items, source = "purchase") {
  if (!items.length) return;
  const payload = items.map((item) => ({
    collector_id: collectorId,
    order_id: orderId,
    product_id: item.product_id,
    quantity: Math.max(1, Number(item.quantity) || 1),
    source,
  }));

  await supabase
    .from("collector_collections")
    .upsert(payload, { onConflict: "collector_id,order_id,product_id,source" });
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "popup-fresh-supabase" });
});

app.get("/fresh/bootstrap", async (req, res) => {
  const collectorId = resolveCollectorId(req);
  await ensureCollectorProfile(collectorId);
  const profile = await summarizeCart(collectorId);

  const { data: collectionRows } = await supabase
    .from("collector_collections")
    .select("id")
    .eq("collector_id", collectorId);

  const { data: poaps } = await supabase
    .from("collector_poaps")
    .select("id")
    .eq("collector_id", collectorId);

  const { data: subscriptions } = await supabase
    .from("collector_subscriptions")
    .select("id")
    .eq("collector_id", collectorId);

  const { data: orders } = await supabase
    .from("commerce_orders")
    .select("id")
    .eq("collector_id", collectorId);

  res.json({
    collector_id: collectorId,
    user_type: "guest_collector",
    profile_summary: {
      collection_count: (collectionRows || []).length,
      poap_count: (poaps || []).length,
      subscription_count: (subscriptions || []).length,
      cart_items: profile.items.length,
      order_count: (orders || []).length,
    },
  });
});

app.get("/fresh/home", async (req, res) => {
  const collectorId = resolveCollectorId(req);
  await ensureCollectorProfile(collectorId);

  const { data: posts, error } = await supabase
    .from("discover_posts")
    .select("id, product_id, creator_id, caption, featured, created_at")
    .eq("featured", true)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message || "Failed to load featured" });

  const featured = await buildFeedItems(posts || [], collectorId);
  res.json({ collector_id: collectorId, featured });
});

app.get("/fresh/discover", async (req, res) => {
  const collectorId = resolveCollectorId(req);
  await ensureCollectorProfile(collectorId);

  const { data: posts, error } = await supabase
    .from("discover_posts")
    .select("id, product_id, creator_id, caption, featured, created_at")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message || "Failed to load discover feed" });

  const feed = await buildFeedItems(posts || [], collectorId);
  res.json({ collector_id: collectorId, feed });
});

app.post("/fresh/discover/:postId/like", async (req, res) => {
  const collectorId = resolveCollectorId(req);
  const postId = String(req.params.postId || "").trim();
  if (!postId) return res.status(400).json({ error: "postId is required" });

  await ensureCollectorProfile(collectorId);

  const { data: post } = await supabase
    .from("discover_posts")
    .select("id")
    .eq("id", postId)
    .maybeSingle();

  if (!post) return res.status(404).json({ error: "Post not found" });

  const { data: existing } = await supabase
    .from("discover_post_likes")
    .select("id")
    .eq("post_id", postId)
    .eq("collector_id", collectorId)
    .maybeSingle();

  if (existing?.id) {
    await supabase
      .from("discover_post_likes")
      .delete()
      .eq("id", existing.id);
  } else {
    await supabase
      .from("discover_post_likes")
      .insert({ post_id: postId, collector_id: collectorId });
  }

  const { data: likeRows } = await supabase
    .from("discover_post_likes")
    .select("post_id, collector_id")
    .eq("post_id", postId);

  const likeCount = (likeRows || []).length;
  const liked = (likeRows || []).some((row) => row.collector_id === collectorId);
  return res.json({ post_id: postId, liked, like_count: likeCount });
});

app.get("/fresh/discover/:postId/comments", async (req, res) => {
  const postId = String(req.params.postId || "").trim();
  const { data, error } = await supabase
    .from("discover_post_comments")
    .select("id, post_id, collector_id, body, created_at")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) return res.status(500).json({ error: error.message || "Failed to load comments" });
  res.json({ post_id: postId, comments: data || [] });
});

app.post("/fresh/discover/:postId/comments", async (req, res) => {
  const collectorId = resolveCollectorId(req);
  const postId = String(req.params.postId || "").trim();
  const body = String(req.body?.body || "").trim();

  if (!postId) return res.status(400).json({ error: "postId is required" });
  if (!body) return res.status(400).json({ error: "Comment body is required" });

  await ensureCollectorProfile(collectorId);

  const { data, error } = await supabase
    .from("discover_post_comments")
    .insert({ post_id: postId, collector_id: collectorId, body })
    .select("id, post_id, collector_id, body, created_at")
    .single();

  if (error) return res.status(500).json({ error: error.message || "Failed to post comment" });
  return res.status(201).json({ comment: data });
});
app.get("/fresh/products/:id", async (req, res) => {
  const productId = String(req.params.id || "").trim();
  const { data: product, error } = await supabase
    .from("creator_products")
    .select("id, creator_id, title, description, image_url, preview_url, delivery_url, price_eth, product_type, delivery_mode")
    .eq("id", productId)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message || "Failed to load product" });
  if (!product) return res.status(404).json({ error: "Product not found" });

  const { data: creator } = await supabase
    .from("creator_profiles")
    .select("id, name, handle, profile_image_url")
    .eq("id", product.creator_id)
    .maybeSingle();

  const render = resolveProductRender(product);
  return res.json({
    id: product.id,
    creator_id: product.creator_id,
    title: product.title,
    description: product.description,
    image_url: render.image_url || product.image_url || "",
    price_eth: Number(product.price_eth) || 0,
    product_type: render.product_type,
    render_mode: render.render_mode,
    delivery_mode: product.delivery_mode,
    readable_url: render.readable_url,
    download_url: render.download_url,
    creator_name: creator?.name || "Creator",
    creator_handle: creator?.handle || "",
    creator_avatar_url: creator?.profile_image_url || null,
  });
});

app.get("/fresh/cart/:collectorId", async (req, res) => {
  const collectorId = normalizeCollectorId(req.params.collectorId);
  if (!collectorId) return res.status(400).json({ error: "collectorId is required" });
  await ensureCollectorProfile(collectorId);
  const cart = await summarizeCart(collectorId);
  return res.json(cart);
});

app.post("/fresh/cart/add", async (req, res) => {
  const collectorId = resolveCollectorId(req);
  const productId = String(req.body?.product_id || "").trim();
  const quantity = Math.max(1, Number(req.body?.quantity) || 1);
  if (!productId) return res.status(400).json({ error: "product_id is required" });

  await ensureCollectorProfile(collectorId);

  const { data: product } = await supabase
    .from("creator_products")
    .select("id")
    .eq("id", productId)
    .maybeSingle();
  if (!product) return res.status(404).json({ error: "Product not found" });

  const { data: existing } = await supabase
    .from("commerce_carts")
    .select("quantity")
    .eq("collector_id", collectorId)
    .eq("product_id", productId)
    .maybeSingle();

  const nextQuantity = Math.max(1, Number(existing?.quantity || 0) + quantity);

  await supabase
    .from("commerce_carts")
    .upsert(
      { collector_id: collectorId, product_id: productId, quantity: nextQuantity },
      { onConflict: "collector_id,product_id" }
    );

  const cart = await summarizeCart(collectorId);
  return res.json(cart);
});

app.patch("/fresh/cart/:collectorId/items/:productId", async (req, res) => {
  const collectorId = normalizeCollectorId(req.params.collectorId);
  const productId = String(req.params.productId || "").trim();
  const quantity = Math.max(1, Number(req.body?.quantity) || 1);
  if (!collectorId || !productId) {
    return res.status(400).json({ error: "collectorId and productId are required" });
  }

  await ensureCollectorProfile(collectorId);

  const { data: existing } = await supabase
    .from("commerce_carts")
    .select("quantity")
    .eq("collector_id", collectorId)
    .eq("product_id", productId)
    .maybeSingle();

  if (!existing) return res.status(404).json({ error: "Cart item not found" });

  await supabase
    .from("commerce_carts")
    .update({ quantity })
    .eq("collector_id", collectorId)
    .eq("product_id", productId);

  const cart = await summarizeCart(collectorId);
  return res.json(cart);
});

app.delete("/fresh/cart/:collectorId/items/:productId", async (req, res) => {
  const collectorId = normalizeCollectorId(req.params.collectorId);
  const productId = String(req.params.productId || "").trim();
  if (!collectorId || !productId) {
    return res.status(400).json({ error: "collectorId and productId are required" });
  }

  await ensureCollectorProfile(collectorId);

  await supabase
    .from("commerce_carts")
    .delete()
    .eq("collector_id", collectorId)
    .eq("product_id", productId);

  const cart = await summarizeCart(collectorId);
  return res.json(cart);
});

app.post("/fresh/checkout", async (req, res) => {
  const collectorId = resolveCollectorId(req);
  const paymentMethodCandidate = String(req.body?.payment_method || "offramp_partner")
    .trim()
    .toLowerCase();
  const paymentMethod = paymentMethodCandidate === "onchain" ? "onchain" : "offramp_partner";
  const purchaseChannel = paymentMethod === "onchain" ? "buy_onchain" : "buy_offchain";
  const directItems = Array.isArray(req.body?.items) ? req.body.items : [];

  await ensureCollectorProfile(collectorId);

  const cart = await summarizeCart(collectorId);
  const itemsToCheckout = directItems.length > 0
    ? directItems
        .map((entry) => ({
          product_id: String(entry?.product_id || "").trim(),
          quantity: Math.max(1, Number(entry?.quantity) || 1),
        }))
        .filter((entry) => entry.product_id)
    : cart.items.map((entry) => ({ product_id: entry.product_id, quantity: entry.quantity }));

  if (itemsToCheckout.length === 0) {
    return res.status(400).json({ error: "No checkout items found" });
  }

  const productIds = itemsToCheckout.map((entry) => entry.product_id);
  const productsById = await loadProductsByIds(productIds);
  const creatorIds = Object.values(productsById).map((product) => product.creator_id);
  const creatorsById = await loadCreatorsByIds(creatorIds);

  const hydratedItems = itemsToCheckout.map((entry) => {
    const product = productsById[entry.product_id];
    if (!product) return null;
    const creator = creatorsById[product.creator_id];
    const render = resolveProductRender(product);
    return {
      product_id: product.id,
      quantity: entry.quantity,
      unit_price_eth: Number(product.price_eth) || 0,
      line_total_eth: Number(((Number(product.price_eth) || 0) * entry.quantity).toFixed(6)),
      title: product.title,
      image_url: render.image_url || product.image_url,
      product_type: render.product_type,
      render_mode: render.render_mode,
      readable_url: render.readable_url,
      download_url: render.download_url,
      delivery_mode: product.delivery_mode,
      creator_name: creator?.name || "Creator",
      creator_handle: creator?.handle || "",
    };
  });

  if (hydratedItems.some((entry) => !entry)) {
    return res.status(404).json({ error: "One or more products are unavailable" });
  }

  const finalizedItems = hydratedItems.filter(Boolean);
  const totalEth = Number(
    finalizedItems.reduce((sum, entry) => sum + Number(entry.line_total_eth || 0), 0).toFixed(6)
  );

  const fulfillmentMode = mapFulfillmentMode(finalizedItems);

  const orderId = `order-${randomUUID().slice(0, 10)}`;
  const orderPayload = {
    id: orderId,
    collector_id: collectorId,
    status: "paid",
    payment_method: paymentMethod,
    purchase_channel: purchaseChannel,
    fulfillment_mode: fulfillmentMode,
    total_eth: totalEth,
    tx_hash: req.body?.tx_hash ? String(req.body.tx_hash) : null,
    offchain_provider: paymentMethod === "offramp_partner" ? "partner" : null,
  };

  const { error: orderError } = await supabase
    .from("commerce_orders")
    .insert(orderPayload);

  if (orderError) return res.status(500).json({ error: orderError.message || "Failed to create order" });

  const orderItemsPayload = finalizedItems.map((item) => ({
    order_id: orderId,
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price_eth: item.unit_price_eth,
    line_total_eth: item.line_total_eth,
    title: item.title,
    image_url: item.image_url,
    product_type: item.product_type,
    render_mode: item.render_mode,
    readable_url: item.readable_url,
    download_url: item.download_url,
  }));

  const { error: itemsError } = await supabase
    .from("commerce_order_items")
    .insert(orderItemsPayload);

  if (itemsError) return res.status(500).json({ error: itemsError.message || "Failed to create order items" });

  let giftPayload = null;
  const giftRequested = Boolean(req.body?.gift && typeof req.body.gift === "object");

  if (giftRequested) {
    const recipientLabel = String(req.body?.gift?.recipient_label || req.body?.gift?.recipient || "friend").trim();
    const giftToken = randomUUID().replace(/-/g, "");
    const claimUrl = `${req.protocol}://${req.get("host")}/gift/${giftToken}`;

    giftPayload = {
      token: giftToken,
      order_id: orderId,
      sender_collector_id: collectorId,
      recipient_label: recipientLabel || "friend",
      status: "pending",
      claim_url: claimUrl,
    };

    const { error: giftError } = await supabase
      .from("gifting_orders")
      .insert({
        token: giftToken,
        order_id: orderId,
        sender_collector_id: collectorId,
        recipient_label: giftPayload.recipient_label,
        status: "pending",
        claim_url: claimUrl,
      });

    if (giftError) return res.status(500).json({ error: giftError.message || "Failed to create gift" });

    await supabase
      .from("commerce_orders")
      .update({ gift_token: giftToken })
      .eq("id", orderId);
  } else {
    await grantCollection(collectorId, orderId, finalizedItems, "purchase");
  }

  await supabase
    .from("commerce_carts")
    .delete()
    .eq("collector_id", collectorId);

  await mintPoapIfEligible(collectorId);

  return res.status(201).json({
    order: {
      id: orderId,
      status: "paid",
      payment_method: paymentMethod,
      total_eth: totalEth,
      created_at: nowIso(),
      items: finalizedItems,
      gift_token: giftPayload?.token || null,
    },
    gift: giftPayload
      ? {
          token: giftPayload.token,
          claim_url: giftPayload.claim_url,
          recipient_label: giftPayload.recipient_label,
          status: giftPayload.status,
        }
      : null,
  });
});
app.get("/fresh/gifts/:token", async (req, res) => {
  const token = String(req.params.token || "").trim();
  const { data: gift, error } = await supabase
    .from("gifting_orders")
    .select("token, status, recipient_label, sender_collector_id, created_at, responded_at, order_id")
    .eq("token", token)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message || "Gift lookup failed" });
  if (!gift) return res.status(404).json({ error: "Gift not found" });

  const { data: order } = await supabase
    .from("commerce_orders")
    .select("total_eth")
    .eq("id", gift.order_id)
    .maybeSingle();

  const { data: items } = await supabase
    .from("commerce_order_items")
    .select("product_id, quantity, unit_price_eth, line_total_eth, title, image_url, product_type, render_mode, readable_url, download_url")
    .eq("order_id", gift.order_id);

  return res.json({
    token: gift.token,
    status: gift.status,
    recipient_label: gift.recipient_label,
    sender_collector_id: gift.sender_collector_id,
    created_at: gift.created_at,
    responded_at: gift.responded_at,
    items: items || [],
    order_total_eth: order?.total_eth || 0,
  });
});

app.post("/fresh/gifts/:token/accept", async (req, res) => {
  const collectorId = resolveCollectorId(req);
  const token = String(req.params.token || "").trim();

  await ensureCollectorProfile(collectorId);

  const { data: gift, error } = await supabase
    .from("gifting_orders")
    .select("token, status, order_id, sender_collector_id")
    .eq("token", token)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message || "Gift lookup failed" });
  if (!gift) return res.status(404).json({ error: "Gift not found" });
  if (gift.status !== "pending") {
    return res.status(409).json({ error: "Gift has already been processed" });
  }

  await supabase
    .from("gifting_orders")
    .update({
      status: "accepted",
      responded_at: nowIso(),
      recipient_collector_id: collectorId,
    })
    .eq("token", token);

  const { data: items } = await supabase
    .from("commerce_order_items")
    .select("product_id, quantity")
    .eq("order_id", gift.order_id);

  await grantCollection(collectorId, gift.order_id, items || [], "gift_accept");

  return res.json({ success: true, token, status: "accepted" });
});

app.post("/fresh/gifts/:token/reject", async (req, res) => {
  const token = String(req.params.token || "").trim();
  const { data: gift } = await supabase
    .from("gifting_orders")
    .select("status")
    .eq("token", token)
    .maybeSingle();

  if (!gift) return res.status(404).json({ error: "Gift not found" });
  if (gift.status !== "pending") {
    return res.status(409).json({ error: "Gift has already been processed" });
  }

  await supabase
    .from("gifting_orders")
    .update({ status: "rejected", responded_at: nowIso() })
    .eq("token", token);

  return res.json({ success: true, token, status: "rejected" });
});

app.get("/fresh/profile/:collectorId", async (req, res) => {
  const collectorId = normalizeCollectorId(req.params.collectorId);
  if (!collectorId) return res.status(400).json({ error: "collectorId is required" });

  await ensureCollectorProfile(collectorId);

  const [cart, collections, poaps, subscriptions, orders, pendingGifts] = await Promise.all([
    summarizeCart(collectorId),
    supabase
      .from("collector_collections")
      .select("id, order_id, product_id, quantity, acquired_at")
      .eq("collector_id", collectorId),
    supabase
      .from("collector_poaps")
      .select("id, code, title, description, created_at")
      .eq("collector_id", collectorId),
    supabase
      .from("collector_subscriptions")
      .select("id, creator_id, status, created_at")
      .eq("collector_id", collectorId),
    supabase
      .from("commerce_orders")
      .select("id, status, payment_method, total_eth, created_at, gift_token")
      .eq("collector_id", collectorId)
      .order("created_at", { ascending: false }),
    supabase
      .from("gifting_orders")
      .select("token, sender_collector_id, recipient_label, created_at, claim_url, order_id")
      .eq("sender_collector_id", collectorId)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);

  const collectionRows = collections.data || [];
  const productIds = collectionRows.map((row) => row.product_id);
  const productsById = await loadProductsByIds(productIds);
  const creatorIds = Object.values(productsById).map((product) => product.creator_id);
  const creatorsById = await loadCreatorsByIds(creatorIds);

  const collection = collectionRows.map((entry) => {
    const product = productsById[entry.product_id];
    const creator = product ? creatorsById[product.creator_id] : null;
    const render = product ? resolveProductRender(product) : null;
    return {
      id: entry.id,
      product_id: entry.product_id,
      title: product?.title || "Untitled Product",
      image_url: render?.image_url || product?.image_url || "",
      product_type: render?.product_type || "file",
      render_mode: render?.render_mode || "download",
      readable_url: render?.readable_url || null,
      download_url: render?.download_url || null,
      creator_name: creator?.name || "Creator",
      acquired_at: entry.acquired_at,
    };
  });

  const orderRows = orders.data || [];
  const orderIds = orderRows.map((order) => order.id);
  const { data: orderItems } = await supabase
    .from("commerce_order_items")
    .select("order_id, product_id, quantity, unit_price_eth, line_total_eth, title, image_url, product_type, render_mode, readable_url, download_url")
    .in("order_id", orderIds);

  const ordersHydrated = orderRows.map((order) => ({
    id: order.id,
    status: order.status,
    payment_method: order.payment_method,
    total_eth: order.total_eth,
    created_at: order.created_at,
    items: (orderItems || []).filter((item) => item.order_id === order.id),
    gift_token: order.gift_token || null,
  }));

  const pendingGiftRows = pendingGifts.data || [];
  const pendingOrders = pendingGiftRows.map((gift) => gift.order_id);
  const { data: pendingGiftItems } = await supabase
    .from("commerce_order_items")
    .select("order_id, product_id, quantity, unit_price_eth, line_total_eth, title, image_url, product_type, render_mode, readable_url, download_url")
    .in("order_id", pendingOrders);

  const pendingGiftsHydrated = pendingGiftRows.map((gift) => ({
    token: gift.token,
    sender_collector_id: gift.sender_collector_id,
    recipient_label: gift.recipient_label,
    created_at: gift.created_at,
    items: (pendingGiftItems || []).filter((item) => item.order_id === gift.order_id),
    claim_url: gift.claim_url,
  }));

  return res.json({
    collector_id: collectorId,
    collection,
    poaps: poaps.data || [],
    subscriptions: subscriptions.data || [],
    cart,
    orders: ordersHydrated,
    pending_gifts: pendingGiftsHydrated,
    creator_dashboard_path: "/creator/analytics",
  });
});

app.post("/fresh/share", (req, res) => {
  const postId = String(req.body?.post_id || "").trim();
  if (!postId) return res.status(400).json({ error: "post_id is required" });
  const shareUrl = `${req.protocol}://${req.get("host")}/share/${encodeURIComponent(postId)}`;
  return res.json({
    share_url: shareUrl,
    share_message: "Check this creator post on POPUP.",
    platform_urls: {
      twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(`Check this creator post ${shareUrl}`)}`,
    },
  });
});

app.get("/share/:postId", async (req, res) => {
  const postId = String(req.params.postId || "").trim();
  if (!postId) {
    return res.status(400).send("Invalid share link.");
  }

  const { data: post } = await supabase
    .from("discover_posts")
    .select("id, product_id, creator_id, caption, created_at")
    .eq("id", postId)
    .maybeSingle();

  if (!post) {
    return res.status(404).send("Share item not found.");
  }

  const collectorId = resolveCollectorId(req);
  const feedItems = await buildFeedItems([post], collectorId);
  const feedItem = feedItems[0];

  if (!feedItem) {
    return res.status(404).send("Share item unavailable.");
  }

  const host = req.get("host");
  const baseUrl = `${req.protocol}://${host}`;
  const shareUrl = `${baseUrl}/share/${encodeURIComponent(postId)}`;
  const redirectUrl = `${baseUrl}/discover?post=${encodeURIComponent(postId)}`;
  const title = String(feedItem.title || "POPUP creator post").replace(/</g, "&lt;");
  const description = String(feedItem.description || "Discover this digital product on POPUP.").replace(/</g, "&lt;");
  const image = String(feedItem.image_url || `${baseUrl}/logo.png`).replace(/</g, "&lt;");

  res.set("Content-Type", "text/html; charset=utf-8");
  res.send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:url" content="${shareUrl}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${image}" />
    <meta http-equiv="refresh" content="0;url=${redirectUrl}" />
  </head>
  <body>
    <p>Redirecting to POPUP discovery...</p>
    <a href="${redirectUrl}">Continue</a>
  </body>
</html>`);
});

app.use((_req, res) => {
  res.status(404).json({ error: "Endpoint not found", path: _req.path, method: _req.method });
});

app.use((err, _req, res, _next) => {
  console.error("Fresh API error:", err);
  res.status(500).json({ error: err?.message || "Internal server error" });
});

if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  app.listen(Number(PORT) || 3000, () => {
    console.log(`Fresh Supabase API listening on http://localhost:${PORT}`);
  });
}

export default app;
