import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { uploadsDir } from './uploads';
import supabase, { SUPABASE_CONFIGURED } from './supabaseClient';

const router = Router();

// Multer setup for local uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// Helper to construct full image URL
const getImageUrl = (req: any, filename: string) => {
  return `${req.protocol}://${req.get('host')}/uploads/${filename}`;
};

// If Supabase isn't configured, short-circuit routes with a clear error
if (!SUPABASE_CONFIGURED) {
  router.use((req, res) => {
    res.status(500).json({ error: 'Supabase not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY in .env' });
  });
}

// ─────────────────────────────────────────
// CATEGORIES
// ─────────────────────────────────────────

router.get('/sb/categories', async (req, res) => {
  try {
    const { data: categories, error: catErr } = await supabase.from('category').select('*');
    if (catErr) throw catErr;
    const { data: products, error: prodErr } = await supabase.from('product').select('id, category_id');
    if (prodErr) throw prodErr;
    const counts: Record<string, number> = {};
    (products || []).forEach((p: any) => {
      if (!p.category_id) return;
      counts[p.category_id] = (counts[p.category_id] || 0) + 1;
    });
    const withCount = (categories || []).map((c: any) => ({
      ...c,
      _count: { products: counts[c.id] || 0 },
    }));
    res.json(withCount);
  } catch (err) {
    console.error('Supabase categories error', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

router.post('/sb/categories', async (req, res) => {
  try {
    const { name, image_url } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const { data, error } = await supabase.from('category').insert([{ name, image_url }]).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Supabase create category error', err);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

router.get('/categories', async (req, res) => {
  try {
    const { data: categories, error: catErr } = await supabase.from('category').select('*');
    if (catErr) throw catErr;
    const { data: products, error: prodErr } = await supabase.from('product').select('id, category_id');
    if (prodErr) throw prodErr;
    const counts: Record<string, number> = {};
    (products || []).forEach((p: any) => {
      if (!p.category_id) return;
      counts[p.category_id] = (counts[p.category_id] || 0) + 1;
    });
    const withCount = (categories || []).map((c: any) => ({
      ...c,
      _count: { products: counts[c.id] || 0 },
    }));
    res.json(withCount);
  } catch (error) {
    console.error('Supabase fetch categories error', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

router.post('/categories', upload.single('image'), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const imageUrl = req.file ? getImageUrl(req, req.file.filename) : null;
    const { data, error } = await supabase.from('category').insert([{ name, image_url: imageUrl }]).select().single();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Supabase create category error', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

router.delete('/categories/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { error } = await supabase.from('category').delete().match({ id });
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Supabase delete category error', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

router.delete('/sb/categories/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { error } = await supabase.from('category').delete().match({ id });
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('Supabase delete category error', err);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

router.put('/categories/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { name, image_url } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const updatePayload: any = { name };
    if (image_url !== undefined) updatePayload.image_url = image_url;
    const { data, error } = await supabase.from('category').update(updatePayload).match({ id }).select().single();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Supabase update category error', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// ─────────────────────────────────────────
// PRODUCTS
// ─────────────────────────────────────────

router.get('/sb/products', async (req, res) => {
  try {
    const { isSignature, categoryId } = req.query;
    let query = supabase.from('product').select('*, product_image(*), product_variation(*), category(*)');
    if (isSignature === 'true') query = query.eq('is_signature', true);
    if (categoryId) query = query.eq('category_id', String(categoryId));
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Supabase products error', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

router.get('/sb/products/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { data, error } = await supabase
      .from('product')
      .select('*, product_image(*), product_variation(*), category(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Supabase product detail error', err);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

router.post('/sb/products', async (req, res) => {
  try {
    const { name, short_description, description, price, is_signature, category_id, main_image, images, variations, stock, metadata } = req.body;
    const { data: prod, error: prodErr } = await supabase
      .from('product')
      .insert([{ name, short_description, description, price, is_signature, category_id, main_image, stock: stock ?? 0, metadata: metadata ?? {} }])
      .select()
      .single();
    if (prodErr) throw prodErr;
    if (Array.isArray(images) && images.length > 0) {
      const imgRows = images.map((url: string) => ({ url, product_id: prod.id }));
      const { error: imgErr } = await supabase.from('product_image').insert(imgRows);
      if (imgErr) console.error('product_image insert error', imgErr);
    }
    if (Array.isArray(variations) && variations.length > 0) {
      const varRows = variations.map((v: any) => ({
        name: v.name,
        value: v.value,
        price_added: v.priceAdded ?? v.price_added ?? 0,
        image_url: v.imageUrl ?? v.image_url ?? null,
        product_id: prod.id,
      }));
      const { error: varErr } = await supabase.from('product_variation').insert(varRows);
      if (varErr) console.error('product_variation insert error', varErr);
    }
    res.json(prod);
  } catch (err) {
    console.error('Supabase create product error', err);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

router.delete('/sb/products/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { error } = await supabase.from('product').delete().match({ id });
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('Supabase delete product error', err);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

router.put('/sb/products/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { name, short_description, description, price, is_signature, category_id, main_image, images, variations, stock, metadata } = req.body;
    const { data: updated, error: updateErr } = await supabase
      .from('product')
      .update({ name, short_description, description, price, is_signature, category_id, main_image, stock: stock ?? 0, metadata: metadata ?? {} })
      .match({ id })
      .select()
      .single();
    if (updateErr) throw updateErr;
    const { error: delImgErr } = await supabase.from('product_image').delete().match({ product_id: id });
    if (delImgErr) console.error('product_image delete error', delImgErr);
    if (Array.isArray(images) && images.length > 0) {
      const imgRows = images.map((url: string) => ({ url, product_id: id }));
      const { error: imgErr } = await supabase.from('product_image').insert(imgRows);
      if (imgErr) console.error('product_image insert error', imgErr);
    }
    const { error: delVarErr } = await supabase.from('product_variation').delete().match({ product_id: id });
    if (delVarErr) console.error('product_variation delete error', delVarErr);
    if (Array.isArray(variations) && variations.length > 0) {
      const varRows = variations.map((v: any) => ({
        name: v.name,
        value: v.value,
        price_added: v.priceAdded ?? v.price_added ?? 0,
        image_url: v.imageUrl ?? v.image_url ?? null,
        product_id: id,
      }));
      const { error: varErr } = await supabase.from('product_variation').insert(varRows);
      if (varErr) console.error('product_variation insert error', varErr);
    }
    res.json(updated);
  } catch (err) {
    console.error('Supabase update product error', err);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

router.get('/products', async (req, res) => {
  try {
    const { isSignature, categoryId } = req.query;
    let query = supabase.from('product').select('*, product_image(*), product_variation(*), category(*)');
    if (isSignature === 'true') query = query.eq('is_signature', true);
    if (categoryId) query = query.eq('category_id', String(categoryId));
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

router.get('/products/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('product')
      .select('*, product_image(*), product_variation(*), category(*)')
      .eq('id', req.params.id)
      .single();
    if (error) {
      if ((error as any).code === 'PGRST116') return res.status(404).json({ error: 'Product not found' });
      throw error;
    }
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

router.post('/products', upload.any(), async (req: any, res) => {
  try {
    const { name, shortDescription, description, price, isSignature, categoryId, variations } = req.body;
    const files = (req.files ?? []) as Express.Multer.File[];
    const mainImage = files.find((file) => file.fieldname === 'mainImage');
    const secondaryImages = files.filter((file) => file.fieldname === 'secondaryImages');
    if (!mainImage) {
      return res.status(400).json({ error: 'Main image is required' });
    }
    const mainImageUrl = getImageUrl(req, mainImage.filename);
    const { data: product, error: prodErr } = await supabase
      .from('product')
      .insert([{ name, short_description: shortDescription, description, price: parseFloat(price), is_signature: isSignature === 'true', category_id: categoryId || null, main_image: mainImageUrl }])
      .select()
      .single();
    if (prodErr) throw prodErr;
    if (secondaryImages.length > 0) {
      const imageCreates = secondaryImages.map((file: any) => ({ url: getImageUrl(req, file.filename), product_id: product.id }));
      const { error: imgErr } = await supabase.from('product_image').insert(imageCreates);
      if (imgErr) console.error('product_image insert error', imgErr);
    }
    if (variations) {
      const parsedVars = JSON.parse(variations);
      const varCreates = parsedVars.map((v: any) => ({
        name: v.name,
        value: v.value,
        price_added: parseFloat(v.priceAdded || 0),
        image_url: (() => {
          const variationImage = v.imageField ? files.find((file) => file.fieldname === v.imageField) : null;
          return variationImage ? getImageUrl(req, variationImage.filename) : null;
        })(),
        product_id: product.id,
      }));
      if (varCreates.length > 0) {
        const { error: varErr } = await supabase.from('product_variation').insert(varCreates);
        if (varErr) console.error('product_variation insert error', varErr);
      }
    }
    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

router.put('/products/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { name, short_description, description, price, is_signature, category_id, main_image, images, variations, stock, metadata } = req.body;
    const { data: updated, error: updateErr } = await supabase
      .from('product')
      .update({ name, short_description, description, price, is_signature, category_id, main_image, stock: stock ?? 0, metadata: metadata ?? {} })
      .match({ id })
      .select()
      .single();
    if (updateErr) throw updateErr;
    const { error: delImgErr } = await supabase.from('product_image').delete().match({ product_id: id });
    if (delImgErr) console.error('product_image delete error', delImgErr);
    if (Array.isArray(images) && images.length > 0) {
      const imgRows = images.map((url: string) => ({ url, product_id: id }));
      const { error: imgErr } = await supabase.from('product_image').insert(imgRows);
      if (imgErr) console.error('product_image insert error', imgErr);
    }
    const { error: delVarErr } = await supabase.from('product_variation').delete().match({ product_id: id });
    if (delVarErr) console.error('product_variation delete error', delVarErr);
    if (Array.isArray(variations) && variations.length > 0) {
      const varRows = variations.map((v: any) => ({
        name: v.name,
        value: v.value,
        price_added: v.priceAdded ?? v.price_added ?? 0,
        image_url: v.imageUrl ?? v.image_url ?? null,
        product_id: id,
      }));
      const { error: varErr } = await supabase.from('product_variation').insert(varRows);
      if (varErr) console.error('product_variation insert error', varErr);
    }
    res.json(updated);
  } catch (err) {
    console.error('Supabase update product error', err);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

router.delete('/products/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { error } = await supabase.from('product').delete().match({ id });
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Duplicate a product
router.post('/sb/products/:id/duplicate', async (req, res) => {
  try {
    const origId = req.params.id;
    const { data: orig, error: origErr } = await supabase.from('product').select('*').eq('id', origId).single();
    if (origErr || !orig) return res.status(404).json({ error: 'Original product not found' });
    const { data: imgs } = await supabase.from('product_image').select('*').eq('product_id', origId);
    const { data: vars } = await supabase.from('product_variation').select('*').eq('product_id', origId);
    const { data: newProd, error: newProdErr } = await supabase
      .from('product')
      .insert([{ name: orig.name, short_description: orig.short_description, description: orig.description, price: orig.price, is_signature: orig.is_signature, category_id: orig.category_id, main_image: orig.main_image, stock: orig.stock ?? 0, metadata: orig.metadata ?? {} }])
      .select()
      .single();
    if (newProdErr) throw newProdErr;
    const newId = newProd.id;
    if (imgs && imgs.length > 0) {
      await supabase.from('product_image').insert(imgs.map((img: any) => ({ url: img.url, product_id: newId })));
    }
    if (vars && vars.length > 0) {
      await supabase.from('product_variation').insert(vars.map((v: any) => ({ name: v.name, value: v.value, price_added: v.price_added, image_url: v.image_url, product_id: newId })));
    }
    res.json({ created: [newProd] });
  } catch (err) {
    console.error('duplicate product error', err);
    res.status(500).json({ error: 'Failed to duplicate product' });
  }
});

// ─────────────────────────────────────────
// ORDERS
// ─────────────────────────────────────────

router.post('/sb/orders', async (req, res) => {
  try {
    const { guestDeviceId, customerName, customerEmail, customerPhone, shippingAddress, items } = req.body;
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Order must contain items' });
    let subtotal = 0;
    const orderItems = items.map((it: any) => {
      const qty = Number(it.quantity);
      const unit = Number(it.priceAtOrder ?? it.unit_price ?? 0);
      subtotal += qty * unit;
      return { product_id: it.productId, variation_id: it.variationId ?? null, variation_name: it.variationName ?? null, quantity: qty, unit_price: unit };
    });
    const total = subtotal;
    const { data: order, error: orderErr } = await supabase
      .from('order')
      .insert([{ guest_device_id: guestDeviceId || null, customer_name: customerName, customer_email: customerEmail || null, customer_phone: customerPhone, shipping_address: shippingAddress, subtotal, shipping: 0, tax: 0, total, status: 'PENDING', meta: {} }])
      .select()
      .single();
    if (orderErr) throw orderErr;
    const itemsRows = orderItems.map((it: any) => ({ ...it, order_id: order.id }));
    await supabase.from('order_item').insert(itemsRows);
    const { data: fullOrder } = await supabase.from('order').select('*, order_item(*)').eq('id', order.id).single();
    res.json(fullOrder);
  } catch (err) {
    console.error('Supabase create order error', err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

router.post('/orders', async (req, res) => {
  try {
    const { guestDeviceId, customerName, customerEmail, customerPhone, shippingAddress, items } = req.body;
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Order must contain items' });
    let subtotal = 0;
    const orderItems = [] as any[];
    for (const it of items) {
      const qty = Number(it.quantity);
      if (!it.productId || !Number.isInteger(qty) || qty < 1) return res.status(400).json({ error: 'Invalid order item' });
      const { data: product, error: prodErr } = await supabase.from('product').select('*, product_variation(*)').eq('id', it.productId).single();
      if (prodErr || !product) return res.status(400).json({ error: 'Product not found' });
      const variation = it.variationId ? (product.product_variation || []).find((v: any) => v.id === it.variationId) : null;
      const unit = Number(product.price || 0) + Number(variation?.price_added ?? 0);
      subtotal += unit * qty;
      orderItems.push({ product_id: it.productId, variation_id: it.variationId || null, variation_name: it.variationName || null, quantity: qty, unit_price: unit });
    }
    const total = subtotal;
    const { data: order, error: orderErr } = await supabase
      .from('order')
      .insert([{ guest_device_id: guestDeviceId || null, customer_name: customerName, customer_email: customerEmail || null, customer_phone: customerPhone, shipping_address: shippingAddress, subtotal, shipping: 0, tax: 0, total, status: 'PENDING', meta: {} }])
      .select()
      .single();
    if (orderErr) throw orderErr;
    const itemsRows = orderItems.map((it) => ({ ...it, order_id: order.id }));
    await supabase.from('order_item').insert(itemsRows);
    const { data: fullOrder, error: fullErr } = await supabase.from('order').select('*, order_item(*)').eq('id', order.id).single();
    if (fullErr) throw fullErr;
    res.json(fullOrder);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create order';
    console.error(error);
    res.status(500).json({ error: message });
  }
});

router.get('/orders', async (req, res) => {
  try {
    const { guestDeviceId } = req.query;
    let query = supabase.from('order').select('*, order_item(*, product(*))').order('created_at', { ascending: false });
    if (guestDeviceId) query = query.eq('guest_device_id', String(guestDeviceId));
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

router.get('/sb/orders', async (req, res) => {
  try {
    const { data, error } = await supabase.from('order').select('*, order_item(*)').order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Supabase orders error', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

router.put('/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const { data, error } = await supabase.from('order').update({ status }).match({ id: req.params.id }).select().single();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

router.put('/sb/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const { data, error } = await supabase.from('order').update({ status }).match({ id: req.params.id }).select().single();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

export default router;
