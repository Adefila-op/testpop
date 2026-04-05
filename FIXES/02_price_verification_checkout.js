/**
 * PRICE VERIFICATION - Server Implementation
 * File: server/api/checkout.js
 * 
 * This verifies prices server-side before accepting payment
 */

export async function createOrderHandler(req, res, supabaseAdmin) {
  try {
    const { dropId, quantity, address } = req.body;
    
    // CRITICAL FIX #1: Verify price from request against database
    const { data: drop, error: dropError } = await supabaseAdmin
      .from('drops')
      .select('id, price_eth, supply, sold, artist_id')
      .eq('id', dropId)
      .single();
    
    if (dropError || !drop) {
      return res.status(404).json({ 
        error: 'Drop not found',
        dropId 
      });
    }
    
    // Check client price against server price
    const clientPrice = parseFloat(req.body.priceEth || '0');
    const serverPrice = parseFloat(drop.price_eth || '0');
    
    // Allow 0.1% variance for floating point errors
    const variance = serverPrice * 0.001;
    if (Math.abs(clientPrice - serverPrice) > variance) {
      // Price mismatch - potential attack
      console.warn(`Price mismatch for drop ${dropId}: client=${clientPrice}, server=${serverPrice}`);
      
      // Log to audit trail
      await supabaseAdmin.from('audit_log').insert({
        action: 'price_mismatch_detected',
        user_address: address,
        drop_id: dropId,
        client_price: clientPrice,
        server_price: serverPrice,
        timestamp: new Date().toISOString()
      }).catch(console.error);
      
      return res.status(400).json({ 
        error: 'Price verification failed',
        code: 'PRICE_MISMATCH',
        expectedPrice: serverPrice,
        receivedPrice: clientPrice
      });
    }
    
    // Check supply
    if (drop.sold + quantity > drop.supply) {
      return res.status(400).json({ 
        error: 'Insufficient supply',
        available: drop.supply - drop.sold,
        requested: quantity
      });
    }
    
    // CRITICAL FIX #2: Use server-verified price, not client price
    const totalPrice = serverPrice * quantity;
    
    // Calculate revenue split
    const platformFee = totalPrice * 0.1; // 10% platform fee
    const artistShare = totalPrice - platformFee;
    
    // Create order with server-verified prices
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        drop_id: dropId,
        buyer_address: address,
        quantity,
        price_unit_eth: serverPrice, // Use server price!
        price_total_eth: totalPrice,   // Use server price!
        platform_fee_eth: platformFee,
        artist_share_eth: artistShare,
        status: 'pending_payment',
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (orderError) {
      return res.status(500).json({ 
        error: 'Failed to create order',
        details: orderError.message 
      });
    }
    
    // Return order with server-verified prices
    res.json({
      orderId: order.id,
      dropId: order.drop_id,
      quantity: order.quantity,
      priceUnitEth: order.price_unit_eth,
      priceTotalEth: order.price_total_eth,
      status: order.status
    });
    
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      code: 'ORDER_CREATION_FAILED'
    });
  }
}

/**
 * Helper: Verify product prices
 */
export async function verifyProductPrice(productId, submittedPrice, supabaseAdmin) {
  const { data: product, error } = await supabaseAdmin
    .from('products')
    .select('id, price_usd')
    .eq('id', productId)
    .single();
  
  if (error || !product) {
    throw new Error('Product not found');
  }
  
  const serverPrice = parseFloat(product.price_usd || '0');
  const clientPrice = parseFloat(submittedPrice || '0');
  const variance = serverPrice * 0.001; // 0.1% tolerance
  
  if (Math.abs(clientPrice - serverPrice) > variance) {
    throw new Error('Price verification failed');
  }
  
  return serverPrice;
}

/**
 * MIGRATION NEEDED:
 * Add 'audit_log' table if not exists:
 * 
 * CREATE TABLE IF NOT EXISTS audit_log (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   action TEXT NOT NULL,
 *   user_address TEXT,
 *   drop_id UUID REFERENCES drops(id),
 *   product_id UUID REFERENCES products(id),
 *   client_price DECIMAL,
 *   server_price DECIMAL,
 *   timestamp TIMESTAMP DEFAULT NOW(),
 *   details JSONB
 * );
 */
