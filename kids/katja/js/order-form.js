/**
 * Order Form with Stock Validation and Automatic Inventory Deduction
 * Requires Google Apps Script backend
 */

let inventoryData = {};
let cart = [];

// Google Apps Script Web App URL (you'll need to create this)
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby1XY6iUOrell3iX4FVZi5puZSCeb1bCcWlaAotgT4edi9nrv1GhErpJl5Zob7ESR8Z/exec';

// Pricing for jar sizes
const PRICING = {
    '4oz': 6.00,
    '8oz Wide': 9.00,
    '8oz Regular': 9.00,
    '12oz': 12.00,
    '16oz': 15.00,
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
 * Falls back to production columns if stock columns don't exist
 */
function aggregateStock(data) {
    const products = {};
    
    // Helper to get stock, falling back to production count
    const getStock = (row, stockCol, prodCol) => {
        return parseInt(row[stockCol]) || parseInt(row[prodCol]) || 0;
    };
    
    data.forEach(row => {
        const productKey = `${row['Fruit']}_${row['Product Genre']}_${row['Alcohol flavoring'] || 'none'}`;
        
        if (!products[productKey]) {
            products[productKey] = {
                name: `${row['Fruit']} ${row['Product Genre']}`,
                alcohol: row['Alcohol flavoring'] || '',
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
                        ${product.alcohol ? `<p class="text-muted small">${product.alcohol}</p>` : ''}
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
        // Add static Full Batch card
    html += `
        <div class="col-md-6 mb-4" id="product-full-batch">
            <div class="card order-product-card" role="article" aria-label="Full Batch product">
                <div class="card-body">
                    <h5 class="card-title">Full Batch (~64oz)</h5>
                    <p class="text-muted">A complete batch of any spread flavor</p>
                    <div class="alert alert-info" role="status">
                        <i class="fas fa-info-circle"></i> <strong>Starting at $65</strong> - Full batch orders require a custom quote based on your flavor selection and any special requests. Final price may vary.
                    </div>
                    <p class="mb-2"><strong>What you get:</strong></p>
                    <ul class="mb-3">
                        <li>Approximately 64oz of spread</li>
                        <li>Your choice of any available ingredients</li>
                        <li>Custom selection of jar sizes</li>
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
                        <option value="Delivery">Local Delivery ($5 Eugene area)</option>
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
        
        html += `
            <tr>
                <td>${item.name}</td>
                <td>${item.size}</td>
                <td>${item.quantity}</td>
                <td>$${itemTotal.toFixed(2)}</td>
                <td><button class="btn btn-sm btn-danger" onclick="removeFromCart(${index})"><i class="fas fa-trash"></i></button></td>
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
    
    // Clone cart and add delivery fee as line item if applicable
    const orderItems = [...cart];
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
