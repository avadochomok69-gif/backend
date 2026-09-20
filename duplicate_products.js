require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function duplicateProducts() {
  console.log("Fetching existing products...");
  const { data: products, error } = await supabase.from('product').select('*');
  
  if (error) {
    console.error("Failed to fetch products:", error);
    return;
  }

  if (!products || products.length === 0) {
    console.log("No products found to duplicate.");
    return;
  }

  console.log(`Found ${products.length} products. Duplicating each one...`);

  for (const orig of products) {
    console.log(`Duplicating: ${orig.name}`);
    
    // Fetch images
    const { data: imgs } = await supabase.from('product_image').select('*').eq('product_id', orig.id);
    // Fetch variations
    const { data: vars } = await supabase.from('product_variation').select('*').eq('product_id', orig.id);

    // Insert new product
    const { data: newProd, error: newProdErr } = await supabase
      .from('product')
      .insert([{ 
        name: orig.name + ' (Copy)', 
        short_description: orig.short_description, 
        description: orig.description, 
        price: orig.price, 
        is_signature: orig.is_signature, 
        category_id: orig.category_id, 
        main_image: orig.main_image, 
        stock: orig.stock || 0, 
        metadata: orig.metadata || {} 
      }])
      .select()
      .single();

    if (newProdErr) {
      console.error(`Failed to duplicate ${orig.name}:`, newProdErr);
      continue;
    }

    const newId = newProd.id;

    // Insert new images
    if (imgs && imgs.length > 0) {
      await supabase.from('product_image').insert(
        imgs.map(img => ({ url: img.url, product_id: newId }))
      );
    }

    // Insert new variations
    if (vars && vars.length > 0) {
      await supabase.from('product_variation').insert(
        vars.map(v => ({ 
          name: v.name, 
          value: v.value, 
          price_added: v.price_added, 
          image_url: v.image_url, 
          product_id: newId 
        }))
      );
    }

    console.log(`Successfully duplicated ${orig.name} -> ${newProd.name}`);
  }
  
  console.log("Duplication complete!");
}

duplicateProducts();
