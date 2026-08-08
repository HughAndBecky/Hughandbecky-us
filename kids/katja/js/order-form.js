/**
 * Order Form with Stock Validation and Automatic Inventory Deduction
 * Requires Google Apps Script backend
 */

let inventoryData = {};
let cart = [];

// Google Apps Script Web App URL (you'll need to create this)
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw6TM1mk7a3pWWe6PGjdRvPWpSTHbcEiIaBXxHf06XBpUTk58AipddSzyCf0WzH6YtH/exec';

// Pricing for jar sizes
const PRICING = {
    '4oz': 6.00,
    '8oz Wide': 9.00,
    '8oz Regular': 9.00,
    '12oz': 12.00,
    '16oz': 15.00,
    '2x8oz': 16.00,  // Classic Duo set
    '4x4oz': 24.00,  // Taster Flight sets
    '~64oz': 65.00,  // Full batch base price (may vary)
    'Customization': 0.00,  // Full Batch customization fee (TBD)
    'Service': 5.00   // Delivery fee
};

/**
 * Track event in Google Analytics (if available)
 */
function trackEvent(category, action, label, value) {
    if (typeof gtag !== 'undefined') {
        gtag('event', action, {
            'event_category': category,
            'event_label': label,
            'value': value
        });
        console.log('GA Event:', category, action, label, value);
    }
}

/**
 * Save cart to localStorage
 */
function saveCart() {
    try {
        localStorage.setItem('katja-jam-cart', JSON.stringify(cart));
        console.log('Cart saved to localStorage');
    } catch (e) {
        console.error('Error saving cart:', e);
    }
}

/**
 * Load cart from localStorage
 */
function loadCart() {
    try {
        const saved = localStorage.getItem('katja-jam-cart');
        if (saved) {
            cart = JSON.parse(saved);
            console.log('Cart loaded from localStorage:', cart.length, 'items');
            updateCartDisplay();
            return true;
        }
    } catch (e) {
        console.error('Error loading cart:', e);
    }
    return false;
}

/**
 * Clear cart from memory and localStorage
 */
function clearCartStorage() {
    cart = [];
    try {
        localStorage.removeItem('katja-jam-cart');
        console.log('Cart cleared from localStorage');
    } catch (e) {
        console.error('Error clearing cart:', e);
    }
}

/**
 * Load inventory from spreadsheet
 */
async function loadInventoryForOrders() {
    try {
        const response = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vRGeDZ9VZDliVXZoEUb36lxDC-6VkQSIXt4Q9_V4eswdnwbSJnOJF78Ox_SvYtebvuziOnYVlDOgSve/pub?gid=1393831276&single=true&output=tsv');
        const text = await response.text();
        const data = parseTSV(text);
        
        inventoryData = aggregateStock(data);
        renderOrderForm();
        
        // Load saved cart from localStorage
        loadCart();
    } catch (error) {
        console.error('Error loading inventory:', error);
        document.getElementById('order-form-container').innerHTML = 
            '<p class="text-danger">Error loading inventory. Please refresh the page.</p>';
    }
}

/**
 * Parse TSV data
 */
function parseTSV(tsv) {
    const lines = tsv.trim().split('\n');
    const headers = lines[0].split('\t');
    
    return lines.slice(1).map(line => {
        const values = line.split('\t');
        const row = {};
        headers.forEach((header, i) => {
            row[header] = values[i] || '';
        });
        return row;
    });
}

/**
 * Aggregate stock by product
 * Each batch gets its own entry (uses BatchID to keep batches separate)
 */
function aggregateStock(data) {
    const products = {};
    
    // Helper to get stock, falling back to production count
    const getStock = (row, stockCol, prodCol) => {
        return parseInt(row[stockCol]) || parseInt(row[prodCol]) || 0;
    };
    
    data.forEach(row => {
        // Use BatchID to keep different batches separate
        // This is important for taster flights - each batch should count as a different variation
        const batchId = row['BatchID'] || row['Batch ID'] || '';
        const productKey = batchId || `${row['Fruit']}_${row['Product Genre']}_${row['Alcohol flavoring'] || 'none'}`;
        
        if (!products[productKey]) {
            products[productKey] = {
                name: `${row['Fruit']} ${row['Product Genre']}`,
                fruit: row['Fruit'],  // Store fruit separately for easier filtering
                flavoring: row['Alcohol flavoring'] || '',
                ingredients: row['Other Ingredients'] || '',
                batchId: batchId,
                stock: {
                    '4oz': getStock(row, 'Stock 4oz', '4oz count'),
                    '8oz Wide': getStock(row, 'Stock 8oz Wide', '8oz wide count'),
                    '8oz Regular': getStock(row, 'Stock 8oz Regular', '8oz regular count'),
                    '12oz': getStock(row, 'Stock 12oz', '12oz count'),
                    '16oz': getStock(row, 'Stock 16oz', '16oz count')
                }
            };
        }
    });
    
    return products;
}

/**
 * Create URL-safe ID from product name
 */
function createProductId(productName) {
    return 'product-' + productName.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

/**
 * Render order form with available products
 */
function renderOrderForm() {
    const container = document.getElementById('order-form-container');
    
    let html = '<div class="row">';
    
    for (const [key, product] of Object.entries(inventoryData)) {
        // Skip Full Batch - it has its own static card
        if (product.name && product.name.toLowerCase().includes('full batch')) continue;
        
        const hasStock = Object.values(product.stock).some(qty => qty > 0);
        
        if (!hasStock) continue; // Skip out-of-stock items
        
        const productId = createProductId(product.name);
        
        html += `
            <div class="col-md-6 mb-4" id="${productId}">
                <div class="card order-product-card" role="article" aria-label="${product.name} product">
                    <div class="card-body">
                        <h5 class="card-title">${product.name}</h5>
                        ${product.flavoring && product.flavoring.toLowerCase() !== 'none' && product.flavoring !== '*None*' ? `<p class="text-muted small"><em>${product.flavoring}</em></p>` : ''}
                        ${product.ingredients ? `<p class="text-muted small">${product.ingredients}</p>` : ''}
                        <div class="size-selection" role="group" aria-label="Select jar size and quantity">
        `;
        
        // Add size options
        for (const [size, qty] of Object.entries(product.stock)) {
            if (qty > 0) {
                html += `
                    <div class="form-group row align-items-center mb-2">
                        <label class="col-sm-3 col-form-label" for="${key}_${size}">${size}</label>
                        <div class="col-sm-5">
                            <input type="number" 
                                   class="form-control form-control-sm" 
                                   id="${key}_${size}"
                                   min="0" 
                                   max="${qty}" 
                                   value="0"
                                   data-product="${key}"
                                   data-size="${size}"
                                   data-name="${product.name}"
                                   data-max="${qty}"
                                   aria-label="Quantity of ${size} jars"
                                   aria-describedby="${key}_${size}_stock">
                        </div>
                        <div class="col-sm-4">
                            <small id="${key}_${size}_stock" class="text-success">${qty} available</small>
                        </div>
                    </div>
                `;
            }
        }
        
        html += `
                        </div>
                        <button class="btn btn-sm btn-primary mt-2" onclick="addToCart('${key}')" aria-label="Add ${product.name} to cart">
                            <i class="fas fa-cart-plus" aria-hidden="true"></i> Add to Cart
                        </button>
                        <a href="#cart-section" class="btn btn-sm btn-outline-success mt-2 ml-2 jump-to-cart-btn" style="display: none;" onclick="trackEvent('Ecommerce', 'view_cart', 'Jump to cart button', 0)">
                            <i class="fas fa-shopping-cart" aria-hidden="true"></i> View Cart
                        </a>
                        <div id="feedback-${key}" class="cart-feedback mt-2" role="status" aria-live="polite"></div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Add static Sets cards
    const tasterFruits = getAvailableFruitTasterFlights();
    const tasterFlavorings = getAvailableFlavoringTasterFlights();
    
    html += `
        <div class="col-md-6 mb-4" id="product-classic-duo">
            <div class="card order-product-card" role="article" aria-label="Classic Duo Set">
                <div class="card-body">
                    <h5 class="card-title">Duo</h5>
                    <p class="text-muted">Random pairing of two 8oz jars</p>
                    <p class="badge badge-info">2 × 8oz - $16.00</p>
                    <div class="form-group mb-2">
                        <label for="classic-duo-quantity-order"><strong>Quantity:</strong></label>
                        <input type="number" id="classic-duo-quantity-order" class="form-control form-control-sm" value="1" min="1" max="10" style="width: 80px;">
                    </div>
                    <button class="btn btn-primary" onclick="addClassicDuoToCartFromOrder()" aria-label="Add Classic Duo to cart">
                        <i class="fas fa-cart-plus"></i> Add to Cart
                    </button>
                    <a href="#cart-section" class="btn btn-outline-success ml-2 jump-to-cart-btn" style="display: none;" onclick="trackEvent('Ecommerce', 'view_cart', 'Jump to cart button', 0)">
                        <i class="fas fa-shopping-cart"></i> View Cart
                    </a>
                    <div id="feedback-classic-duo-order" class="cart-feedback mt-2" role="status" aria-live="polite"></div>
                </div>
            </div>
        </div>
    `;
    
    // Show Fruit Taster if available, otherwise show Random Taster Flight
    if (tasterFruits.length > 0) {
        html += `
        <div class="col-md-6 mb-4" id="product-fruit-taster">
            <div class="card order-product-card" role="article" aria-label="Fruit Taster Flight Set">
                <div class="card-body">
                    <h5 class="card-title">Fruit Taster Flight</h5>
                    <p class="text-muted">Sample 4 different batches of the same fruit</p>
                    <p class="badge badge-info">4 × 4oz - $24.00</p>
                    <div class="form-group mb-2">
                        <label for="fruit-taster-select-order"><strong>Select Fruit:</strong></label>
                        <select id="fruit-taster-select-order" class="form-control form-control-sm">
                            <option value="">-- Choose a fruit --</option>
                        </select>
                    </div>
                    <div class="form-group mb-2">
                        <label for="fruit-taster-quantity-order"><strong>Quantity:</strong></label>
                        <input type="number" id="fruit-taster-quantity-order" class="form-control form-control-sm" value="1" min="1" max="10" style="width: 80px;">
                    </div>
                    <button class="btn btn-primary" onclick="addFruitTasterFlightToCartFromOrder()" aria-label="Add Fruit Taster Flight to cart">
                        <i class="fas fa-cart-plus"></i> Add to Cart
                    </button>
                    <a href="#cart-section" class="btn btn-outline-success ml-2 jump-to-cart-btn" style="display: none;" onclick="trackEvent('Ecommerce', 'view_cart', 'Jump to cart button', 0)">
                        <i class="fas fa-shopping-cart"></i> View Cart
                    </a>
                    <div id="feedback-fruit-taster-flight-order" class="cart-feedback mt-2" role="status" aria-live="polite"></div>
                </div>
            </div>
        </div>
        `;
    } else {
        // Fruit Taster out of stock - show Random Taster Flight instead
        html += `
        <div class="col-md-6 mb-4" id="product-random-taster-fruit">
            <div class="card order-product-card" role="article" aria-label="Random Taster Flight Set">
                <div class="card-body">
                    <h5 class="card-title">Random Taster Flight</h5>
                    <p class="text-muted">4 completely random 4oz jars - a surprise selection!</p>
                    <p class="badge badge-info">4 × 4oz - $24.00</p>
                    <div class="form-group mb-2">
                        <label for="random-taster-quantity-order"><strong>Quantity:</strong></label>
                        <input type="number" id="random-taster-quantity-order" class="form-control form-control-sm" value="1" min="1" max="10" style="width: 80px;">
                    </div>
                    <button class="btn btn-primary" onclick="addRandomTasterFlightToCartFromOrder()" aria-label="Add Random Taster Flight to cart">
                        <i class="fas fa-cart-plus"></i> Add to Cart
                    </button>
                    <a href="#cart-section" class="btn btn-outline-success ml-2 jump-to-cart-btn" style="display: none;" onclick="trackEvent('Ecommerce', 'view_cart', 'Jump to cart button', 0)">
                        <i class="fas fa-shopping-cart"></i> View Cart
                    </a>
                    <div id="feedback-random-taster-flight-order" class="cart-feedback mt-2" role="status" aria-live="polite"></div>
                </div>
            </div>
        </div>
        `;
    }
    
    // Show Flavoring Taster if available, otherwise show Random Taster Flight (if not already shown)
    if (tasterFlavorings.length > 0) {
        html += `
        <div class="col-md-6 mb-4" id="product-flavoring-taster">
            <div class="card order-product-card" role="article" aria-label="Flavoring Taster Flight Set">
                <div class="card-body">
                    <h5 class="card-title">Flavoring Taster Flight</h5>
                    <p class="text-muted">Sample 4 different batches with the same accent flavoring</p>
                    <p class="badge badge-info">4 × 4oz - $24.00</p>
                    <div class="form-group mb-2">
                        <label for="flavoring-taster-select-order"><strong>Select Flavoring:</strong></label>
                        <select id="flavoring-taster-select-order" class="form-control form-control-sm">
                            <option value="">-- Choose a flavoring --</option>
                        </select>
                    </div>
                    <div class="form-group mb-2">
                        <label for="flavoring-taster-quantity-order"><strong>Quantity:</strong></label>
                        <input type="number" id="flavoring-taster-quantity-order" class="form-control form-control-sm" value="1" min="1" max="10" style="width: 80px;">
                    </div>
                    <button class="btn btn-primary" onclick="addFlavoringTasterFlightToCartFromOrder()" aria-label="Add Flavoring Taster Flight to cart">
                        <i class="fas fa-cart-plus"></i> Add to Cart
                    </button>
                    <a href="#cart-section" class="btn btn-outline-success ml-2 jump-to-cart-btn" style="display: none;" onclick="trackEvent('Ecommerce', 'view_cart', 'Jump to cart button', 0)">
                        <i class="fas fa-shopping-cart"></i> View Cart
                    </a>
                    <div id="feedback-flavoring-taster-flight-order" class="cart-feedback mt-2" role="status" aria-live="polite"></div>
                </div>
            </div>
        </div>
        `;
    } else if (tasterFruits.length > 0) {
        // Flavoring Taster out of stock but Fruit Taster in stock - show Random Taster Flight
        html += `
        <div class="col-md-6 mb-4" id="product-random-taster-flavoring">
            <div class="card order-product-card" role="article" aria-label="Random Taster Flight Set">
                <div class="card-body">
                    <h5 class="card-title">Random Taster Flight</h5>
                    <p class="text-muted">4 completely random 4oz jars - a surprise selection!</p>
                    <p class="badge badge-info">4 × 4oz - $24.00</p>
                    <div class="form-group mb-2">
                        <label for="random-taster-quantity-order"><strong>Quantity:</strong></label>
                        <input type="number" id="random-taster-quantity-order" class="form-control form-control-sm" value="1" min="1" max="10" style="width: 80px;">
                    </div>
                    <button class="btn btn-primary" onclick="addRandomTasterFlightToCartFromOrder()" aria-label="Add Random Taster Flight to cart">
                        <i class="fas fa-cart-plus"></i> Add to Cart
                    </button>
                    <a href="#cart-section" class="btn btn-outline-success ml-2 jump-to-cart-btn" style="display: none;" onclick="trackEvent('Ecommerce', 'view_cart', 'Jump to cart button', 0)">
                        <i class="fas fa-shopping-cart"></i> View Cart
                    </a>
                    <div id="feedback-random-taster-flight-order" class="cart-feedback mt-2" role="status" aria-live="polite"></div>
                </div>
            </div>
        </div>
        `;
    }
    // Note: If both are out of stock, Random Taster is already shown in place of Fruit Taster

    
    // Add static Full Batch card
    html += `
        <div class="col-md-6 mb-4" id="product-full-batch">
            <div class="card order-product-card" role="article" aria-label="Full Batch product">
                <div class="card-body">
                    <h5 class="card-title">Full Batch</h5>
                    <p class="text-muted">A complete batch of any spread flavor (~64oz)</p>
                    <div class="alert alert-info" role="status">
                        <i class="fas fa-info-circle"></i> <strong>Starting at $65 for ~64oz</strong> - Full batch orders require a custom quote based on your flavor selection and any special requests. Final price may vary.
                    </div>
                    <p class="mb-2"><strong>What you get:</strong></p>
                    <ul class="mb-3">
                        <li>Approximately 64oz of spread</li>
                        <li>Your choice of any available ingredients</li>
                        <li>Custom selection of jar sizes</li>
                        <li>See the informational note above in the pricing section</li>
                    </ul>
                    <button class="btn btn-primary" onclick="addFullBatchToCart()" aria-label="Add full batch to cart">
                        <i class="fas fa-cart-plus"></i> Add to Cart
                    </button>
                    <a href="#cart-section" class="btn btn-outline-success ml-2 jump-to-cart-btn" style="display: none;" onclick="trackEvent('Ecommerce', 'view_cart', 'Jump to cart button', 0)">
                        <i class="fas fa-shopping-cart"></i> View Cart
                    </a>
                    <div id="feedback-full-batch" class="cart-feedback mt-2" role="status" aria-live="polite"></div>
                </div>
            </div>
        </div>
    `;
        html += '</div>';
    
    html += `
        <div id="cart-section" class="mt-4">
            <h3>Your Order</h3>
            <div id="cart-items" role="list" aria-label="Shopping cart items"></div>
            <div class="alert alert-info mt-3" role="status">
                <div><strong>Subtotal:</strong> <span id="cart-subtotal" aria-live="polite">$0.00</span></div>
                <div id="cart-delivery-fee-display" style="display: none;"><strong>Delivery Fee (Eugene, Oregon):</strong> <span id="cart-delivery-fee">$5.00</span></div>
                <div class="mt-2" style="font-size: 1.2em; border-top: 1px solid #ccc; padding-top: 8px;"><strong>Total:</strong> <span id="cart-total" aria-live="polite">$0.00</span></div>
            </div>
            
            <h4 class="mt-4">Customer Information</h4>
            <form id="customer-form" aria-label="Order form">
                <div class="form-group">
                    <label for="customer-name">Name *</label>
                    <input type="text" 
                           class="form-control" 
                           id="customer-name" 
                           name="name"
                           autocomplete="name"
                           aria-required="true" 
                           required>
                </div>
                <div class="form-group">
                    <label for="customer-email">Email *</label>
                    <input type="email" 
                           class="form-control" 
                           id="customer-email" 
                           name="email"
                           autocomplete="email"
                           aria-required="true" 
                           required>
                </div>
                <div class="form-group">
                    <label for="customer-phone">Phone</label>
                    <input type="tel" 
                           class="form-control" 
                           id="customer-phone" 
                           name="tel"
                           autocomplete="tel"
                           placeholder="123-456-7890"
                           aria-required="false"
                           aria-describedby="phone-help">
                    <small id="phone-help" class="form-text text-muted">US format: 123-456-7890</small>
                </div>
                <div class="form-group">
                    <label for="delivery-method">Fulfillment Method *</label>
                    <select class="form-control" id="delivery-method" aria-required="true" aria-describedby="delivery-help" required>
                        <option value="">-- Select --</option>
                        <option value="Pickup">Pickup (Free)</option>
                        <option value="Delivery">Local Delivery ($5 Eugene, Oregon area)</option>
                        <option value="Special Shipping">Special Arrangement Shipping (Extra Cost - We'll Contact You)</option>
                    </select>
                    <small id="delivery-help" class="text-muted">Standard shipping not available. Local delivery area only.</small>
                </div>
                <div id="address-fields" class="form-group">
                    <label>Delivery Address (if applicable)</label>
                    <div class="row">
                        <div class="col-12 mb-2">
                            <input type="text" 
                                   class="form-control" 
                                   id="address-line1" 
                                   name="address-line1"
                                   autocomplete="address-line1"
                                   placeholder="Street address"
                                   aria-label="Street address line 1">
                        </div>
                        <div class="col-12 mb-2">
                            <input type="text" 
                                   class="form-control" 
                                   id="address-line2" 
                                   name="address-line2"
                                   autocomplete="address-line2"
                                   placeholder="Apt, suite, unit, building, floor, etc. (optional)"
                                   aria-label="Street address line 2">
                        </div>
                        <div class="col-md-6 mb-2">
                            <input type="text" 
                                   class="form-control" 
                                   id="address-city" 
                                   name="address-level2"
                                   autocomplete="address-level2"
                                   placeholder="City"
                                   aria-label="City">
                        </div>
                        <div class="col-md-3 mb-2">
                            <input type="text" 
                                   class="form-control" 
                                   id="address-state" 
                                   name="address-level1"
                                   autocomplete="address-level1"
                                   placeholder="State"
                                   aria-label="State"
                                   maxlength="2"
                                   style="text-transform: uppercase;">
                        </div>
                        <div class="col-md-3 mb-2">
                            <input type="text" 
                                   class="form-control" 
                                   id="address-zip" 
                                   name="postal-code"
                                   autocomplete="postal-code"
                                   placeholder="ZIP"
                                   aria-label="ZIP code"
                                   pattern="[0-9]{5}(-[0-9]{4})?"
                                   maxlength="10">
                        </div>
                    </div>
                    <small id="address-help" class="form-text text-muted">Enter your full address if you selected local delivery or special shipping</small>
                </div>
                <div class="form-group">
                    <label for="order-notes">Notes</label>
                    <textarea class="form-control" id="order-notes" rows="3" aria-label="Order notes or special requests"></textarea>
                </div>
                
                <button type="submit" class="btn btn-success btn-lg" aria-label="Submit your order">
                    <i class="fas fa-check" aria-hidden="true"></i> Submit Order
                </button>
                <button type="button" class="btn btn-secondary btn-lg" onclick="clearCart()" aria-label="Clear shopping cart">
                    <i class="fas fa-times" aria-hidden="true"></i> Clear Cart
                </button>
            </form>
        </div>
        
        <div id="order-confirmation" style="display: none;" class="alert alert-success mt-4" role="alert" aria-live="polite">
            <h4 style="color: #155724; font-size: 1.5rem; margin-bottom: 1rem;">✓ Order Submitted Successfully!</h4>
            
            <div style="background: white; padding: 1rem; border-radius: 6px; border: 2px solid #28a745; margin-bottom: 1rem;">
                <p style="margin-bottom: 0.5rem; font-size: 1.1rem;">
                    <strong>Order ID:</strong> <span id="order-id" style="font-family: monospace; font-size: 1.2rem;"></span>
                    <button onclick="copyOrderId()" class="btn btn-sm btn-outline-secondary ml-2" style="font-size: 0.85rem;">
                        <i class="fas fa-copy"></i> Copy
                    </button>
                </p>
                <p id="delivery-fee-display" style="display: none; font-size: 0.9em; color: #666; margin-bottom: 0.5rem;"></p>
                <p style="margin-bottom: 0;"><strong style="font-size: 1.2rem;">Total: $<span id="order-total"></span></strong></p>
            </div>
            
            <div class="alert alert-info" style="margin-bottom: 1rem;">
                <i class="fas fa-envelope"></i> <strong>Confirmation email sent!</strong> Check your inbox for order details and receipt.
            </div>
            
            <div style="margin-top: 1rem; padding: 1rem; background: #f8f9fa; border-radius: 6px; border: 1px solid #dee2e6;">
                <p style="margin-bottom: 0.5rem;"><strong>Payment Options:</strong></p>
                <ul style="margin-bottom: 0.5rem;">
                    <li>Cash (at pickup/delivery)</li>
                    <li>Venmo: <strong><a href="https://venmo.com/u/Hugh-Paterson" target="_blank" rel="noopener noreferrer">@Hugh-Paterson</a></strong></li>
                </ul>
                <div style="text-align: center; margin-top: 1rem;">
                    <img src="../media/venmo/hughpatersonvenmo.png" alt="Venmo QR Code" style="max-width: 200px; border: 1px solid #ddd; border-radius: 8px; padding: 10px; background: white;">
                    <p style="font-size: 0.85em; color: #666; margin-top: 0.5rem;">Scan to pay with Venmo</p>
                </div>
            </div>
            
            <div style="margin-top: 1rem; padding: 0.75rem; background: #fff3cd; border-radius: 6px; border: 1px solid #ffc107;">
                <strong>What's Next:</strong>
                <ul style="margin-bottom: 0; margin-top: 0.5rem;">
                    <li>We'll contact you shortly to arrange pickup/delivery</li>
                    <li>Have payment ready when we deliver or you pick up</li>
                    <li>Save this order ID for your records</li>
                </ul>
            </div>
            
            <div style="margin-top: 1rem; text-align: center;">
                <button onclick="location.reload()" class="btn btn-primary btn-lg">
                    <i class="fas fa-redo"></i> Place Another Order
                </button>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    
    // Populate Sets section dropdowns (if they exist)
    const fruitSelectSets = document.getElementById('fruit-taster-select-sets');
    if (fruitSelectSets) {
        if (tasterFruits.length > 0) {
            tasterFruits.forEach(fruit => {
                const option = document.createElement('option');
                option.value = fruit;
                option.textContent = fruit;
                fruitSelectSets.appendChild(option);
            });
        } else {
            // Show out of stock message
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Out of Stock';
            option.disabled = true;
            fruitSelectSets.appendChild(option);
            fruitSelectSets.disabled = true;
            
            // Hide the add to cart button and quantity input
            const parentCard = fruitSelectSets.closest('.set-card');
            if (parentCard) {
                const fruitButton = parentCard.querySelector('button[onclick*="addFruitTasterFlightToCart"]');
                if (fruitButton) {
                    fruitButton.style.display = 'none';
                }
                const quantityInput = parentCard.querySelector('#fruit-taster-quantity');
                if (quantityInput) {
                    quantityInput.closest('.form-group').style.display = 'none';
                }
            }
        }
    }
    
    const flavoringSelectSets = document.getElementById('flavoring-taster-select-sets');
    if (flavoringSelectSets) {
        if (tasterFlavorings.length > 0) {
            tasterFlavorings.forEach(flavoring => {
                const option = document.createElement('option');
                option.value = flavoring;
                option.textContent = flavoring;
                flavoringSelectSets.appendChild(option);
            });
        } else {
            // Show out of stock message
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Out of Stock';
            option.disabled = true;
            flavoringSelectSets.appendChild(option);
            flavoringSelectSets.disabled = true;
            
            // Hide the add to cart button and quantity input
            const parentCard = flavoringSelectSets.closest('.set-card');
            if (parentCard) {
                const flavoringButton = parentCard.querySelector('button[onclick*="addFlavoringTasterFlightToCart"]');
                if (flavoringButton) {
                    flavoringButton.style.display = 'none';
                }
                const quantityInput = parentCard.querySelector('#flavoring-taster-quantity');
                if (quantityInput) {
                    quantityInput.closest('.form-group').style.display = 'none';
                }
            }
        }
    }
    
    // Check Classic Duo availability and hide button if out of stock
    const classicDuoMax = getAvailableClassicDuoSets();
    const classicDuoButton = document.querySelector('button[onclick*="addClassicDuoToCart"]');
    if (classicDuoButton && classicDuoMax === 0) {
        classicDuoButton.style.display = 'none';
        const quantityInput = document.getElementById('classic-duo-quantity');
        if (quantityInput) {
            quantityInput.closest('.form-group').style.display = 'none';
        }
        // Add out of stock message
        const parentCard = classicDuoButton.closest('.set-card');
        if (parentCard) {
            const outOfStockMsg = document.createElement('p');
            outOfStockMsg.className = 'alert alert-warning';
            outOfStockMsg.textContent = 'Out of Stock';
            outOfStockMsg.style.fontSize = '0.9em';
            outOfStockMsg.style.padding = '8px';
            outOfStockMsg.style.marginBottom = '0';
            parentCard.appendChild(outOfStockMsg);
        }
    }
    
    // Populate dropdowns for order section Sets cards
    const fruitSelectOrder = document.getElementById('fruit-taster-select-order');
    if (fruitSelectOrder) {
        if (tasterFruits.length > 0) {
            tasterFruits.forEach(fruit => {
                const option = document.createElement('option');
                option.value = fruit;
                option.textContent = fruit;
                fruitSelectOrder.appendChild(option);
            });
        } else {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Out of Stock';
            option.disabled = true;
            fruitSelectOrder.appendChild(option);
            fruitSelectOrder.disabled = true;
            
            const parentCard = fruitSelectOrder.closest('.card');
            if (parentCard) {
                const fruitButton = parentCard.querySelector('button[onclick*="addFruitTasterFlightToCartFromOrder"]');
                if (fruitButton) fruitButton.style.display = 'none';
                const quantityInput = parentCard.querySelector('#fruit-taster-quantity-order');
                if (quantityInput) quantityInput.closest('.form-group').style.display = 'none';
            }
        }
    }
    
    const flavoringSelectOrder = document.getElementById('flavoring-taster-select-order');
    if (flavoringSelectOrder) {
        if (tasterFlavorings.length > 0) {
            tasterFlavorings.forEach(flavoring => {
                const option = document.createElement('option');
                option.value = flavoring;
                option.textContent = flavoring;
                flavoringSelectOrder.appendChild(option);
            });
        } else {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Out of Stock';
            option.disabled = true;
            flavoringSelectOrder.appendChild(option);
            flavoringSelectOrder.disabled = true;
            
            const parentCard = flavoringSelectOrder.closest('.card');
            if (parentCard) {
                const flavoringButton = parentCard.querySelector('button[onclick*="addFlavoringTasterFlightToCartFromOrder"]');
                if (flavoringButton) flavoringButton.style.display = 'none';
                const quantityInput = parentCard.querySelector('#flavoring-taster-quantity-order');
                if (quantityInput) quantityInput.closest('.form-group').style.display = 'none';
            }
        }
    }
    
    // Check Classic Duo availability for order section
    const classicDuoButtonOrder = document.querySelector('button[onclick*="addClassicDuoToCartFromOrder"]');
    if (classicDuoButtonOrder && classicDuoMax === 0) {
        classicDuoButtonOrder.style.display = 'none';
        const quantityInput = document.getElementById('classic-duo-quantity-order');
        if (quantityInput) quantityInput.closest('.form-group').style.display = 'none';
        const parentCard = classicDuoButtonOrder.closest('.card');
        if (parentCard) {
            const outOfStockMsg = document.createElement('p');
            outOfStockMsg.className = 'alert alert-warning';
            outOfStockMsg.textContent = 'Out of Stock';
            outOfStockMsg.style.fontSize = '0.9em';
            outOfStockMsg.style.padding = '8px';
            outOfStockMsg.style.marginBottom = '0';
            parentCard.appendChild(outOfStockMsg);
        }
    }
    
    // Attach form submit handler
    document.getElementById('customer-form').addEventListener('submit', submitOrder);
    
    // Add event listener to update cart total when delivery method changes
    const deliveryMethodDropdown = document.getElementById('delivery-method');
    if (deliveryMethodDropdown) {
        deliveryMethodDropdown.addEventListener('change', function() {
            const method = this.value;
            
            // Track delivery method selection
            if (method) {
                trackEvent('Ecommerce', 'select_delivery_method', method, 0);
            }
            
            if (cart.length > 0) {
                updateCartPriceDisplay();
            }
        });
    }
}

/**
 * Show feedback message below Add to Cart button
 * @param {string} productKey - The product key or 'full-batch'
 * @param {string} message - The message to display
 * @param {string} type - 'success' or 'error'
 */
function showFeedback(productKey, message, type) {
    const feedbackEl = document.getElementById(`feedback-${productKey}`);
    if (!feedbackEl) return;
    
    // Set message and style
    feedbackEl.textContent = message;
    feedbackEl.className = `cart-feedback mt-2 cart-feedback-${type} cart-feedback-show`;
    
    // Fade out after 3 seconds
    setTimeout(() => {
        feedbackEl.classList.remove('cart-feedback-show');
    }, 3000);
}

/**
 * Copy order ID to clipboard
 */
function copyOrderId() {
    const orderId = document.getElementById('order-id').textContent;
    navigator.clipboard.writeText(orderId).then(() => {
        // Show brief confirmation
        const btn = event.target.closest('button');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
        btn.classList.add('btn-success');
        btn.classList.remove('btn-outline-secondary');
        
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.classList.remove('btn-success');
            btn.classList.add('btn-outline-secondary');
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
        alert('Order ID: ' + orderId);
    });
}

/**
 * Get list of fruits that have at least 4 different 4oz variations available
 */
function getAvailableFruitTasterFlights() {
    const fruitCounts = {};
    
    Object.keys(inventoryData).forEach(productKey => {
        const product = inventoryData[productKey];
        const fruit = product.fruit;
        
        if (fruit && product.stock['4oz'] > 0) {
            if (!fruitCounts[fruit]) {
                fruitCounts[fruit] = 0;
            }
            fruitCounts[fruit]++;
        }
    });
    
    // Return fruits with at least 4 variations
    return Object.keys(fruitCounts)
        .filter(fruit => fruitCounts[fruit] >= 4)
        .sort();
}

/**
 * Get list of accent flavorings that have at least 4 different 4oz variations available
 */
function getAvailableFlavoringTasterFlights() {
    const flavoringCounts = {};
    
    Object.keys(inventoryData).forEach(productKey => {
        const product = inventoryData[productKey];
        const flavoring = product.flavoring;
        
        if (flavoring && flavoring.trim() !== '' && product.stock['4oz'] > 0) {
            if (!flavoringCounts[flavoring]) {
                flavoringCounts[flavoring] = 0;
            }
            flavoringCounts[flavoring]++;
        }
    });
    
    // Return flavorings with at least 4 variations
    return Object.keys(flavoringCounts)
        .filter(flavoring => flavoringCounts[flavoring] >= 4)
        .sort();
}

/**
 * Calculate maximum Classic Duo sets available (2x 8oz)
 * Returns the number of complete sets that can be made
 */
function getAvailableClassicDuoSets() {
    let availableJars = [];
    
    Object.keys(inventoryData).forEach(productKey => {
        const product = inventoryData[productKey];
        const stock8ozWide = product.stock['8oz Wide'] || 0;
        const stock8ozRegular = product.stock['8oz Regular'] || 0;
        const total8oz = stock8ozWide + stock8ozRegular;
        
        if (total8oz > 0) {
            availableJars.push(total8oz);
        }
    });
    
    // Sort descending to use highest stock items first
    availableJars.sort((a, b) => b - a);
    
    // We need at least 2 different jars for a Duo
    if (availableJars.length < 2) {
        return 0;
    }
    
    // Maximum sets = min of (sum of all jars / 2, or limited by variety)
    const totalJars = availableJars.reduce((sum, count) => sum + count, 0);
    const maxByQuantity = Math.floor(totalJars / 2);
    
    // Also limited by needing 2 different varieties
    const maxByVariety = Math.min(availableJars[0], Math.floor(totalJars / 2));
    
    return Math.min(maxByQuantity, maxByVariety);
}

/**
 * Calculate maximum Fruit Taster Flight sets available for a specific fruit (4x 4oz)
 */
function getAvailableFruitTasterFlightSets(fruit) {
    if (!fruit) return 0;
    
    let variations = [];
    
    Object.keys(inventoryData).forEach(productKey => {
        const product = inventoryData[productKey];
        
        // Use stored fruit property
        if (product.fruit === fruit && product.stock['4oz'] > 0) {
            variations.push(product.stock['4oz']);
        }
    });
    
    // Need at least 4 variations
    if (variations.length < 4) {
        return 0;
    }
    
    // Sort descending
    variations.sort((a, b) => b - a);
    
    // Maximum sets limited by the 4th most abundant variation
    // (since we need 4 different jars per set)
    return variations[3];
}

/**
 * Calculate maximum Flavoring Taster Flight sets available for a specific flavoring (4x 4oz)
 */
function getAvailableFlavoringTasterFlightSets(flavoring) {
    if (!flavoring) return 0;
    
    let variations = [];
    
    Object.keys(inventoryData).forEach(productKey => {
        const product = inventoryData[productKey];
        
        if (product.flavoring === flavoring && product.stock['4oz'] > 0) {
            variations.push(product.stock['4oz']);
        }
    });
    
    // Need at least 4 variations
    if (variations.length < 4) {
        return 0;
    }
    
    // Sort descending
    variations.sort((a, b) => b - a);
    
    // Maximum sets limited by the 4th most abundant variation
    return variations[3];
}

/**
 * Add Fruit Taster Flight to cart (4x 4oz of same fruit, different variations)
 */
function addFruitTasterFlightToCart() {
    const selectElement = document.getElementById('fruit-taster-select-sets');
    const selectedFruit = selectElement ? selectElement.value : '';
    
    if (!selectedFruit) {
        showFeedback('fruit-taster-flight', 'Please select a fruit first', 'error');
        return;
    }
    
    const quantityInput = document.getElementById('fruit-taster-quantity');
    const quantity = quantityInput ? parseInt(quantityInput.value) || 1 : 1;
    
    // Calculate max available sets for this fruit
    const maxStock = getAvailableFruitTasterFlightSets(selectedFruit);
    
    if (maxStock === 0) {
        showFeedback('fruit-taster-flight', 'This fruit flight is currently out of stock', 'error');
        return;
    }
    
    // Check if this exact flight is already in cart
    const existingIndex = cart.findIndex(item => 
        item.productKey === 'fruit-taster-flight' && item.fruitType === selectedFruit
    );
    
    if (existingIndex >= 0) {
        const newTotal = cart[existingIndex].quantity + quantity;
        if (newTotal > maxStock) {
            showFeedback('fruit-taster-flight', `Only ${maxStock} sets available`, 'error');
            return;
        }
        cart[existingIndex].quantity = newTotal;
    } else {
        if (quantity > maxStock) {
            showFeedback('fruit-taster-flight', `Only ${maxStock} sets available`, 'error');
            return;
        }
        cart.push({
            productKey: 'fruit-taster-flight',
            name: `Fruit Taster Flight - ${selectedFruit}`,
            size: '4x4oz',
            quantity: quantity,
            maxStock: maxStock,
            fruitType: selectedFruit
        });
    }
    
    trackEvent('Ecommerce', 'add_to_cart', 'Fruit Taster Flight - ' + selectedFruit, 24.00 * quantity);
    
    saveCart();
    updateCartDisplay();
    showFeedback('fruit-taster-flight', `Added ${quantity} to cart!`, 'success');
}

/**
 * Add Flavoring Taster Flight to cart (4x 4oz with same accent flavoring, different fruits)
 */
function addFlavoringTasterFlightToCart() {
    const selectElement = document.getElementById('flavoring-taster-select-sets');
    const selectedFlavoring = selectElement ? selectElement.value : '';
    
    if (!selectedFlavoring) {
        showFeedback('flavoring-taster-flight', 'Please select a flavoring first', 'error');
        return;
    }
    
    const quantityInput = document.getElementById('flavoring-taster-quantity');
    const quantity = quantityInput ? parseInt(quantityInput.value) || 1 : 1;
    
    // Calculate max available sets for this flavoring
    const maxStock = getAvailableFlavoringTasterFlightSets(selectedFlavoring);
    
    if (maxStock === 0) {
        showFeedback('flavoring-taster-flight', 'This flavoring flight is currently out of stock', 'error');
        return;
    }
    
    // Check if this exact flight is already in cart
    const existingIndex = cart.findIndex(item => 
        item.productKey === 'flavoring-taster-flight' && item.flavoringType === selectedFlavoring
    );
    
    if (existingIndex >= 0) {
        const newTotal = cart[existingIndex].quantity + quantity;
        if (newTotal > maxStock) {
            showFeedback('flavoring-taster-flight', `Only ${maxStock} sets available`, 'error');
            return;
        }
        cart[existingIndex].quantity = newTotal;
    } else {
        if (quantity > maxStock) {
            showFeedback('flavoring-taster-flight', `Only ${maxStock} sets available`, 'error');
            return;
        }
        cart.push({
            productKey: 'flavoring-taster-flight',
            name: `Flavoring Taster Flight - ${selectedFlavoring}`,
            size: '4x4oz',
            quantity: quantity,
            maxStock: maxStock,
            flavoringType: selectedFlavoring
        });
    }
    
    trackEvent('Ecommerce', 'add_to_cart', 'Flavoring Taster Flight - ' + selectedFlavoring, 24.00 * quantity);
    
    saveCart();
    updateCartDisplay();
    showFeedback('flavoring-taster-flight', `Added ${quantity} to cart!`, 'success');
}

/**
 * Add Classic Duo to cart (2x 8oz jars)
 */
function addClassicDuoToCart() {
    const quantityInput = document.getElementById('classic-duo-quantity');
    const quantity = quantityInput ? parseInt(quantityInput.value) || 1 : 1;
    
    // Calculate max available Classic Duo sets
    const maxStock = getAvailableClassicDuoSets();
    
    if (maxStock === 0) {
        showFeedback('classic-duo', 'Classic Duo is currently out of stock', 'error');
        return;
    }
    
    // Check if Classic Duo is already in cart
    const existingIndex = cart.findIndex(item => item.productKey === 'classic-duo-set');
    
    if (existingIndex >= 0) {
        const newTotal = cart[existingIndex].quantity + quantity;
        if (newTotal > maxStock) {
            showFeedback('classic-duo', `Only ${maxStock} sets available`, 'error');
            return;
        }
        cart[existingIndex].quantity = newTotal;
    } else {
        if (quantity > maxStock) {
            showFeedback('classic-duo', `Only ${maxStock} sets available`, 'error');
            return;
        }
        cart.push({
            productKey: 'classic-duo-set',
            name: 'Classic Duo Set',
            size: '2x8oz',
            quantity: quantity,
            maxStock: maxStock
        });
    }
    
    trackEvent('Ecommerce', 'add_to_cart', 'Classic Duo Set', 16.00 * quantity);
    
    saveCart();
    updateCartDisplay();
    showFeedback('classic-duo', `Added ${quantity} to cart!`, 'success');
}

/**
 * Add Full Batch to cart
 */
function addFullBatchToCart() {
    // Add base Full Batch item
    cart.push({
        productKey: 'full-batch',
        name: 'Full Batch',
        size: '~64oz',
        quantity: 1,
        maxStock: 999
    });
    // Add customization fee line item (price TBD)
    cart.push({
        productKey: 'full-batch-customization',
        name: 'Full Batch Customization Fee',
        size: 'Customization',
        quantity: 1,
        maxStock: 999
    });
    
    // Track GA event
    trackEvent('Ecommerce', 'add_to_cart', 'Full Batch', 65.00);
    
    saveCart(); // Save to localStorage
    updateCartDisplay();
    showFeedback('full-batch', 'Added to cart!', 'success');
}

/**
 * Add Classic Duo to cart from order section
 */
function addClassicDuoToCartFromOrder() {
    const quantityInput = document.getElementById('classic-duo-quantity-order');
    const quantity = quantityInput ? parseInt(quantityInput.value) || 1 : 1;
    
    const maxStock = getAvailableClassicDuoSets();
    
    if (maxStock === 0) {
        showFeedback('classic-duo-order', 'Classic Duo is currently out of stock', 'error');
        return;
    }
    
    const existingIndex = cart.findIndex(item => item.productKey === 'classic-duo-set');
    
    if (existingIndex >= 0) {
        const newTotal = cart[existingIndex].quantity + quantity;
        if (newTotal > maxStock) {
            showFeedback('classic-duo-order', `Only ${maxStock} sets available`, 'error');
            return;
        }
        cart[existingIndex].quantity = newTotal;
    } else {
        if (quantity > maxStock) {
            showFeedback('classic-duo-order', `Only ${maxStock} sets available`, 'error');
            return;
        }
        cart.push({
            productKey: 'classic-duo-set',
            name: 'Classic Duo Set',
            size: '2x8oz',
            quantity: quantity,
            maxStock: maxStock
        });
    }
    
    trackEvent('Ecommerce', 'add_to_cart', 'Classic Duo Set', 16.00 * quantity);
    
    saveCart();
    updateCartDisplay();
    showFeedback('classic-duo-order', `Added ${quantity} to cart!`, 'success');
}

/**
 * Add Fruit Taster Flight to cart from order section
 */
function addFruitTasterFlightToCartFromOrder() {
    const selectElement = document.getElementById('fruit-taster-select-order');
    const selectedFruit = selectElement ? selectElement.value : '';
    
    if (!selectedFruit) {
        showFeedback('fruit-taster-flight-order', 'Please select a fruit first', 'error');
        return;
    }
    
    const quantityInput = document.getElementById('fruit-taster-quantity-order');
    const quantity = quantityInput ? parseInt(quantityInput.value) || 1 : 1;
    
    const maxStock = getAvailableFruitTasterFlightSets(selectedFruit);
    
    if (maxStock === 0) {
        showFeedback('fruit-taster-flight-order', 'This fruit flight is currently out of stock', 'error');
        return;
    }
    
    const existingIndex = cart.findIndex(item => 
        item.productKey === 'fruit-taster-flight' && item.fruitType === selectedFruit
    );
    
    if (existingIndex >= 0) {
        const newTotal = cart[existingIndex].quantity + quantity;
        if (newTotal > maxStock) {
            showFeedback('fruit-taster-flight-order', `Only ${maxStock} sets available`, 'error');
            return;
        }
        cart[existingIndex].quantity = newTotal;
    } else {
        if (quantity > maxStock) {
            showFeedback('fruit-taster-flight-order', `Only ${maxStock} sets available`, 'error');
            return;
        }
        cart.push({
            productKey: 'fruit-taster-flight',
            name: `Fruit Taster Flight - ${selectedFruit}`,
            size: '4x4oz',
            quantity: quantity,
            maxStock: maxStock,
            fruitType: selectedFruit
        });
    }
    
    trackEvent('Ecommerce', 'add_to_cart', 'Fruit Taster Flight - ' + selectedFruit, 24.00 * quantity);
    
    saveCart();
    updateCartDisplay();
    showFeedback('fruit-taster-flight-order', `Added ${quantity} to cart!`, 'success');
}

/**
 * Add Flavoring Taster Flight to cart from order section
 */
function addFlavoringTasterFlightToCartFromOrder() {
    const selectElement = document.getElementById('flavoring-taster-select-order');
    const selectedFlavoring = selectElement ? selectElement.value : '';
    
    if (!selectedFlavoring) {
        showFeedback('flavoring-taster-flight-order', 'Please select a flavoring first', 'error');
        return;
    }
    
    const quantityInput = document.getElementById('flavoring-taster-quantity-order');
    const quantity = quantityInput ? parseInt(quantityInput.value) || 1 : 1;
    
    const maxStock = getAvailableFlavoringTasterFlightSets(selectedFlavoring);
    
    if (maxStock === 0) {
        showFeedback('flavoring-taster-flight-order', 'This flavoring flight is currently out of stock', 'error');
        return;
    }
    
    const existingIndex = cart.findIndex(item => 
        item.productKey === 'flavoring-taster-flight' && item.flavoringType === selectedFlavoring
    );
    
    if (existingIndex >= 0) {
        const newTotal = cart[existingIndex].quantity + quantity;
        if (newTotal > maxStock) {
            showFeedback('flavoring-taster-flight-order', `Only ${maxStock} sets available`, 'error');
            return;
        }
        cart[existingIndex].quantity = newTotal;
    } else {
        if (quantity > maxStock) {
            showFeedback('flavoring-taster-flight-order', `Only ${maxStock} sets available`, 'error');
            return;
        }
        cart.push({
            productKey: 'flavoring-taster-flight',
            name: `Flavoring Taster Flight - ${selectedFlavoring}`,
            size: '4x4oz',
            quantity: quantity,
            maxStock: maxStock,
            flavoringType: selectedFlavoring
        });
    }
    
    trackEvent('Ecommerce', 'add_to_cart', 'Flavoring Taster Flight - ' + selectedFlavoring, 24.00 * quantity);
    
    saveCart();
    updateCartDisplay();
    showFeedback('flavoring-taster-flight-order', `Added ${quantity} to cart!`, 'success');
}

/**
 * Calculate maximum Random Taster Flight sets available (4x 4oz completely random)
 */
function getAvailableRandomTasterFlightSets() {
    let stockCounts = [];
    
    Object.keys(inventoryData).forEach(productKey => {
        const product = inventoryData[productKey];
        if (product.stock['4oz'] > 0) {
            stockCounts.push(product.stock['4oz']);
        }
    });
    
    if (stockCounts.length < 4) return 0;
    
    // Sort to find the 4th most abundant (limiting factor)
    stockCounts.sort((a, b) => b - a);
    return stockCounts[3];
}

/**
 * Add Random Taster Flight to cart from order section (4x 4oz completely random)
 */
function addRandomTasterFlightToCartFromOrder() {
    const quantityInput = document.getElementById('random-taster-quantity-order');
    const quantity = quantityInput ? parseInt(quantityInput.value) || 1 : 1;
    
    const maxStock = getAvailableRandomTasterFlightSets();
    
    if (maxStock === 0) {
        showFeedback('random-taster-flight-order', 'Random Taster Flight is currently out of stock', 'error');
        return;
    }
    
    const existingIndex = cart.findIndex(item => item.productKey === 'random-taster-flight');
    
    if (existingIndex >= 0) {
        const newTotal = cart[existingIndex].quantity + quantity;
        if (newTotal > maxStock) {
            showFeedback('random-taster-flight-order', `Only ${maxStock} sets available`, 'error');
            return;
        }
        cart[existingIndex].quantity = newTotal;
    } else {
        if (quantity > maxStock) {
            showFeedback('random-taster-flight-order', `Only ${maxStock} sets available`, 'error');
            return;
        }
        cart.push({
            productKey: 'random-taster-flight',
            name: 'Random Taster Flight',
            size: '4x4oz',
            quantity: quantity,
            maxStock: maxStock
        });
    }
    
    trackEvent('Ecommerce', 'add_to_cart', 'Random Taster Flight', 24.00 * quantity);
    
    saveCart();
    updateCartDisplay();
    showFeedback('random-taster-flight-order', `Added ${quantity} to cart!`, 'success');
}

/**
 * Add products to cart
 */
function addToCart(productKey) {
    const product = inventoryData[productKey];
    let itemsAdded = false;
    
    for (const [size, qty] of Object.entries(product.stock)) {
        const input = document.getElementById(`${productKey}_${size}`);
        if (input && parseInt(input.value) > 0) {
            const quantity = parseInt(input.value);
            
            // Check if already in cart
            const existingIndex = cart.findIndex(item => 
                item.productKey === productKey && item.size === size
            );
            
            if (existingIndex >= 0) {
                cart[existingIndex].quantity += quantity;
            } else {
                cart.push({
                    productKey,
                    name: product.name,
                    size,
                    quantity,
                    maxStock: parseInt(input.dataset.max)
                });
            }
            
            input.value = 0; // Reset input
            itemsAdded = true;
        }
    }
    
    if (itemsAdded) {
        // Track GA event
        trackEvent('Ecommerce', 'add_to_cart', product.name, 0);
        
        saveCart(); // Save to localStorage
        updateCartDisplay();
        showFeedback(productKey, 'Added to cart!', 'success');
    } else {
        showFeedback(productKey, 'Please select a quantity first', 'error');
    }
}

/**
 * Update cart display
 */
function updateCartDisplay() {
    const jumpToCartButtons = document.querySelectorAll('.jump-to-cart-btn');
    const cartSection = document.getElementById('cart-section');
    const cartItemsDiv = document.getElementById('cart-items');
    
    // Always show cart section so anchor links work
    cartSection.style.display = 'block';
    
    if (cart.length === 0) {
        // Hide all "Jump to Cart" buttons when cart is empty
        jumpToCartButtons.forEach(btn => btn.style.display = 'none');
        // Show empty cart message
        cartItemsDiv.innerHTML = '<div class="alert alert-secondary text-center"><i class="fas fa-shopping-cart"></i> Your cart is empty</div>';
        // Update price display to zero
        updateCartPriceDisplay(0);
        return;
    }
    
    // Show all "Jump to Cart" buttons when cart has items
    jumpToCartButtons.forEach(btn => btn.style.display = 'inline-block');
    
    let html = '<table class="table"><thead><tr><th>Product</th><th>Size</th><th>Quantity</th><th>Price</th><th>Action</th></tr></thead><tbody>';
    
    let subtotal = 0;
    cart.forEach((item, index) => {
        const price = PRICING[item.size] || 0;
        const itemTotal = price * item.quantity;
        subtotal += itemTotal;
        
        // Determine max quantity based on item type
        let maxQty = item.maxStock || 999;
        
        html += `
            <tr>
                <td>${item.name}</td>
                <td>${item.size}</td>
                <td>
                    <input type="number" 
                           class="form-control form-control-sm" 
                           style="width: 80px; display: inline-block;" 
                           value="${item.quantity}" 
                           min="1" 
                           max="${maxQty}" 
                           onchange="updateCartQuantity(${index}, this.value)" 
                           aria-label="Quantity for ${item.name}">
                </td>
                <td>$${itemTotal.toFixed(2)}</td>
                <td><button class="btn btn-sm btn-danger" onclick="removeFromCart(${index})" aria-label="Remove ${item.name}"><i class="fas fa-trash"></i></button></td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    
    cartItemsDiv.innerHTML = html;
    
    // Update price display
    updateCartPriceDisplay(subtotal);
}

/**
 * Update cart price display with delivery fee if applicable
 */
function updateCartPriceDisplay(subtotal) {
    if (!subtotal && subtotal !== 0) {
        // Calculate from cart if not provided
        subtotal = cart.reduce((sum, item) => {
            const price = PRICING[item.size] || 0;
            return sum + (price * item.quantity);
        }, 0);
    }
    
    const deliveryMethodElement = document.getElementById('delivery-method');
    const deliveryFee = deliveryMethodElement && deliveryMethodElement.value === 'Delivery' ? 5.00 : 0;
    const total = subtotal + deliveryFee;
    
    document.getElementById('cart-subtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('cart-total').textContent = `$${total.toFixed(2)}`;
    
    // Show/hide delivery fee line
    const deliveryFeeDisplay = document.getElementById('cart-delivery-fee-display');
    if (deliveryFee > 0) {
        deliveryFeeDisplay.style.display = 'block';
    } else {
        deliveryFeeDisplay.style.display = 'none';
    }
}

/**
 * Update quantity of item in cart
 */
function updateCartQuantity(index, newQuantity) {
    const qty = parseInt(newQuantity);
    
    if (isNaN(qty) || qty < 1) {
        // Invalid quantity, reset to 1
        cart[index].quantity = 1;
    } else if (cart[index].maxStock && qty > cart[index].maxStock) {
        // Exceeds max stock, cap at max
        cart[index].quantity = cart[index].maxStock;
    } else {
        cart[index].quantity = qty;
    }
    
    saveCart();
    updateCartDisplay();
    trackEvent('Ecommerce', 'update_cart_quantity', cart[index].name, qty);
}

/**
 * Remove item from cart
 */
function removeFromCart(index) {
    const item = cart[index];
    
    // Track GA event
    if (item) {
        trackEvent('Ecommerce', 'remove_from_cart', item.name, 0);
    }
    
    cart.splice(index, 1);
    saveCart(); // Save to localStorage
    updateCartDisplay();
}

/**
 * Clear entire cart
 */
function clearCart() {
    if (confirm('Clear entire cart?')) {
        // Track GA event
        trackEvent('Ecommerce', 'clear_cart', 'User cleared cart', cart.length);
        
        clearCartStorage(); // Clear from localStorage
        updateCartDisplay();
    }
}

/**
 * Validate email format
 */
function isValidEmail(email) {
    // RFC 5322 compliant email regex (simplified but robust)
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email);
}

/**
 * Validate phone number format (US format)
 */
function isValidPhone(phone) {
    // US phone format: (123) 456-7890, 123-456-7890, 123.456.7890, or 1234567890
    const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
    return phoneRegex.test(phone);
}

/**
 * Get formatted delivery address from separate fields
 */
function getFormattedAddress() {
    const line1 = document.getElementById('address-line1')?.value.trim() || '';
    const line2 = document.getElementById('address-line2')?.value.trim() || '';
    const city = document.getElementById('address-city')?.value.trim() || '';
    const state = document.getElementById('address-state')?.value.trim().toUpperCase() || '';
    const zip = document.getElementById('address-zip')?.value.trim() || '';
    
    if (!line1 && !city && !state && !zip) {
        return ''; // No address provided
    }
    
    let address = line1;
    if (line2) address += '\n' + line2;
    if (city || state || zip) {
        address += '\n' + [city, state, zip].filter(p => p).join(', ');
    }
    
    return address;
}

/**
 * Randomly select products for Classic Duo set (2x 8oz)
 * Returns array of 2 different 8oz product items
 */
function expandClassicDuoSet(quantity) {
    const available8oz = [];
    
    // Collect all available 8oz products
    Object.keys(inventoryData).forEach(productKey => {
        const product = inventoryData[productKey];
        const stock8ozWide = product.stock['8oz Wide'] || 0;
        const stock8ozRegular = product.stock['8oz Regular'] || 0;
        
        if (stock8ozWide > 0) {
            available8oz.push({
                productKey: productKey,
                name: product.name,
                size: '8oz Wide',
                stock: stock8ozWide
            });
        }
        if (stock8ozRegular > 0) {
            available8oz.push({
                productKey: productKey,
                name: product.name,
                size: '8oz Regular',
                stock: stock8ozRegular
            });
        }
    });
    
    // Shuffle array for randomness
    for (let i = available8oz.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [available8oz[i], available8oz[j]] = [available8oz[j], available8oz[i]];
    }
    
    // For each set, pick 2 different products
    const expandedItems = [];
    for (let set = 0; set < quantity; set++) {
        // Pick first jar
        if (available8oz.length > 0) {
            expandedItems.push({
                productKey: available8oz[0].productKey,
                name: available8oz[0].name,
                size: available8oz[0].size,
                quantity: 1
            });
        }
        // Pick second jar (different from first)
        if (available8oz.length > 1) {
            expandedItems.push({
                productKey: available8oz[1].productKey,
                name: available8oz[1].name,
                size: available8oz[1].size,
                quantity: 1
            });
        }
    }
    
    return expandedItems;
}

/**
 * Randomly select products for Fruit Taster Flight set (4x 4oz of same fruit)
 * Returns array of 4 different 4oz product items
 */
function expandFruitTasterFlightSet(fruit, quantity) {
    const available4oz = [];
    
    // Collect all available 4oz products for this fruit
    Object.keys(inventoryData).forEach(productKey => {
        const product = inventoryData[productKey];
        
        // Use stored fruit property
        if (product.fruit === fruit && product.stock['4oz'] > 0) {
            available4oz.push({
                productKey: productKey,
                name: product.name,
                size: '4oz',
                stock: product.stock['4oz']
            });
        }
    });
    
    // Shuffle array for randomness
    for (let i = available4oz.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [available4oz[i], available4oz[j]] = [available4oz[j], available4oz[i]];
    }
    
    // For each set, pick 4 different products
    const expandedItems = [];
    for (let set = 0; set < quantity; set++) {
        for (let i = 0; i < 4 && i < available4oz.length; i++) {
            expandedItems.push({
                productKey: available4oz[i].productKey,
                name: available4oz[i].name,
                size: available4oz[i].size,
                quantity: 1
            });
        }
    }
    
    return expandedItems;
}

/**
 * Randomly select products for Flavoring Taster Flight set (4x 4oz with same flavoring)
 * Returns array of 4 different 4oz product items
 */
function expandFlavoringTasterFlightSet(flavoring, quantity) {
    const available4oz = [];
    
    // Collect all available 4oz products with this flavoring
    Object.keys(inventoryData).forEach(productKey => {
        const product = inventoryData[productKey];
        
        if (product.flavoring === flavoring && product.stock['4oz'] > 0) {
            available4oz.push({
                productKey: productKey,
                name: product.name,
                size: '4oz',
                stock: product.stock['4oz']
            });
        }
    });
    
    // Shuffle array for randomness
    for (let i = available4oz.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [available4oz[i], available4oz[j]] = [available4oz[j], available4oz[i]];
    }
    
    // For each set, pick 4 different products
    const expandedItems = [];
    for (let set = 0; set < quantity; set++) {
        for (let i = 0; i < 4 && i < available4oz.length; i++) {
            expandedItems.push({
                productKey: available4oz[i].productKey,
                name: available4oz[i].name,
                size: available4oz[i].size,
                quantity: 1
            });
        }
    }
    
    return expandedItems;
}

/**
 * Expand Random Taster Flight set into 4 completely random 4oz jars
 */
function expandRandomTasterFlightSet(quantity) {
    const available4oz = [];
    
    // Collect all available 4oz products
    Object.keys(inventoryData).forEach(productKey => {
        const product = inventoryData[productKey];
        
        if (product.stock['4oz'] > 0) {
            available4oz.push({
                productKey: productKey,
                name: product.name,
                size: '4oz',
                stock: product.stock['4oz']
            });
        }
    });
    
    // Shuffle array for randomness
    for (let i = available4oz.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [available4oz[i], available4oz[j]] = [available4oz[j], available4oz[i]];
    }
    
    // For each set, pick 4 different products
    const expandedItems = [];
    for (let set = 0; set < quantity; set++) {
        for (let i = 0; i < 4 && i < available4oz.length; i++) {
            expandedItems.push({
                productKey: available4oz[i].productKey,
                name: available4oz[i].name,
                size: available4oz[i].size,
                quantity: 1
            });
        }
    }
    
    return expandedItems;
}

/**
 * Expand all set items in cart into individual products for order submission
 * Returns a new array with sets replaced by actual products
 */
function expandSetsForOrder(cartItems) {
    const expandedItems = [];
    
    cartItems.forEach(item => {
        if (item.productKey === 'classic-duo-set') {
            // Expand Classic Duo into 2 random 8oz jars
            const duoItems = expandClassicDuoSet(item.quantity);
            expandedItems.push(...duoItems);
        } else if (item.productKey === 'fruit-taster-flight') {
            // Expand Fruit Taster Flight into 4 random 4oz jars of the selected fruit
            const flightItems = expandFruitTasterFlightSet(item.fruitType, item.quantity);
            expandedItems.push(...flightItems);
        } else if (item.productKey === 'flavoring-taster-flight') {
            // Expand Flavoring Taster Flight into 4 random 4oz jars with the selected flavoring
            const flightItems = expandFlavoringTasterFlightSet(item.flavoringType, item.quantity);
            expandedItems.push(...flightItems);
        } else if (item.productKey === 'random-taster-flight') {
            // Expand Random Taster Flight into 4 completely random 4oz jars
            const flightItems = expandRandomTasterFlightSet(item.quantity);
            expandedItems.push(...flightItems);
        } else {
            // Regular item, keep as-is
            expandedItems.push(item);
        }
    });
    
    return expandedItems;
}

/**
 * Submit order to Google Apps Script backend
 */
async function submitOrder(e) {
    e.preventDefault();
    
    if (cart.length === 0) {
        alert('Your cart is empty!');
        return;
    }
    
    // Track checkout attempt
    trackEvent('Ecommerce', 'begin_checkout', 'User clicked submit order', cart.length);
    
    // Validate email
    const email = document.getElementById('customer-email').value;
    if (!isValidEmail(email)) {
        alert('Please enter a valid email address (e.g., name@example.com)');
        document.getElementById('customer-email').focus();
        return;
    }
    
    // Validate phone (if provided)
    const phone = document.getElementById('customer-phone').value;
    if (phone && !isValidPhone(phone)) {
        alert('Please enter a valid phone number (e.g., 123-456-7890)');
        document.getElementById('customer-phone').focus();
        return;
    }
    
    // Calculate total
    const subtotal = cart.reduce((sum, item) => {
        const price = PRICING[item.size] || 0;
        return sum + (price * item.quantity);
    }, 0);
    
    // Add delivery fee for Eugene area deliveries
    const deliveryFee = document.getElementById('delivery-method').value === 'Delivery' ? 5.00 : 0;
    const total = subtotal + deliveryFee;
    
    // Expand sets into individual products for backend inventory management
    const expandedCart = expandSetsForOrder(cart);
    
    // Clone expanded cart and add delivery fee as line item if applicable
    const orderItems = [...expandedCart];
    if (deliveryFee > 0) {
        orderItems.push({
            productKey: 'delivery-fee',
            name: 'Delivery Fee (Eugene, Oregon area)',
            size: 'Service',
            quantity: 1
        });
    }
    
    const orderData = {
        timestamp: new Date().toISOString(),
        customer: {
            name: document.getElementById('customer-name').value,
            email: email,
            phone: document.getElementById('customer-phone').value,
            fulfillmentMethod: document.getElementById('delivery-method').value,
            deliveryAddress: getFormattedAddress(),
            notes: document.getElementById('order-notes').value
        },
        items: orderItems,
        total: total
    };
    
    try {
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain',
            },
            body: JSON.stringify(orderData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Track successful purchase in GA
            trackEvent('Ecommerce', 'purchase', result.orderId, total);
            
            // Track individual items purchased
            cart.forEach(item => {
                trackEvent('Ecommerce', 'purchase_item', `${item.name} (${item.size})`, item.quantity);
            });
            
            // Show confirmation
            document.getElementById('order-id').textContent = result.orderId;
            document.getElementById('order-total').textContent = total.toFixed(2);
            
            // Show delivery fee if applicable
            const deliveryFeeElement = document.getElementById('delivery-fee-display');
            if (deliveryFee > 0) {
                deliveryFeeElement.textContent = `Subtotal: $${subtotal.toFixed(2)} + Delivery Fee (Eugene, Oregon): $${deliveryFee.toFixed(2)}`;
                deliveryFeeElement.style.display = 'block';
            } else {
                deliveryFeeElement.style.display = 'none';
            }
            
            const confirmationElement = document.getElementById('order-confirmation');
            confirmationElement.style.display = 'block';
            document.getElementById('cart-section').style.display = 'none';
            
            // Scroll confirmation into view
            confirmationElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Clear cart from memory and localStorage
            clearCartStorage();
            
            // DON'T reload inventory - confirmation screen is showing
            // User can refresh page manually if they want to place another order
        } else {
            alert('Error submitting order: ' + result.error);
        }
    } catch (error) {
        console.error('Order submission error:', error);
        alert('Error submitting order. Please try again or contact us directly.');
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', loadInventoryForOrders);
