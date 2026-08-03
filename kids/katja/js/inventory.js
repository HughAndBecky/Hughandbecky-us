// Fetch and display jam inventory from Google Spreadsheet
(function() {
  const SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRGeDZ9VZDliVXZoEUb36lxDC-6VkQSIXt4Q9_V4eswdnwbSJnOJF78Ox_SvYtebvuziOnYVlDOgSve/pub?gid=1393831276&single=true&output=tsv';
  
  let allProducts = {}; // Store all products for filtering
  
  // Parse TSV data
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
  
  // Aggregate inventory by product
  function aggregateInventory(data) {
    const products = {};
    
    data.forEach(row => {
      const fruit = row['Fruit'] || '';
      const alcohol = row['Alcohol flavoring'] || '';
      const genre = row['Product Genre'] || '';
      
      // Create product key
      const key = `${fruit} ${genre} (${alcohol})`.trim();
      
      if (!products[key]) {
        products[key] = {
          fruit: fruit,
          genre: genre,
          alcohol: alcohol,
          ingredients: row['Other Ingredients'] || '',
          inventory: {
            '4oz': 0,
            '8oz-wide': 0,
            '8oz-regular': 0,
            '10oz': 0,
            '12oz': 0,
            '16oz': 0
          },
          totalJars: 0
        };
      }
      
      // Add inventory counts
      products[key].inventory['4oz'] += parseInt(row['4oz count']) || 0;
      products[key].inventory['8oz-wide'] += parseInt(row['8oz wide count']) || 0;
      products[key].inventory['8oz-regular'] += parseInt(row['8oz regular count']) || 0;

      products[key].inventory['12oz'] += parseInt(row['12oz count']) || 0;
      products[key].inventory['16oz'] += parseInt(row['16oz count']) || 0;
      
      // Calculate total
      products[key].totalJars = Object.values(products[key].inventory).reduce((a, b) => a + b, 0);
    });
    
    return products;
  }
  
  // Populate filter dropdowns
  function populateFilters(products) {
    const fruits = new Set();
    const genres = new Set();
    const alcohols = new Set();
    
    Object.values(products).forEach(product => {
      if (product.fruit) fruits.add(product.fruit);
      if (product.genre) genres.add(product.genre);
      if (product.alcohol && product.alcohol.toLowerCase() !== 'none') alcohols.add(product.alcohol);
    });
    
    console.log('Populating filters - Fruits:', fruits.size, 'Genres:', genres.size, 'Alcohols:', alcohols.size);
    
    // Populate fruit filter
    const fruitSelect = document.getElementById('filter-fruit');
    if (fruitSelect) {
      fruitSelect.innerHTML = '<option value="">All Fruits</option>';
      Array.from(fruits).sort().forEach(fruit => {
        const option = document.createElement('option');
        option.value = fruit;
        option.textContent = fruit;
        fruitSelect.appendChild(option);
      });
      console.log('Populated fruit filter with', fruits.size, 'options');
    } else {
      console.error('filter-fruit element not found!');
    }
    
    // Populate genre filter
    const genreSelect = document.getElementById('filter-genre');
    if (genreSelect) {
      genreSelect.innerHTML = '<option value="">All Types</option>';
      Array.from(genres).sort().forEach(genre => {
        const option = document.createElement('option');
        option.value = genre;
        option.textContent = genre;
        genreSelect.appendChild(option);
      });
      console.log('Populated genre filter with', genres.size, 'options');
    } else {
      console.error('filter-genre element not found!');
    }
    
    // Populate alcohol filter
    const alcoholSelect = document.getElementById('filter-alcohol');
    if (alcoholSelect) {
      alcoholSelect.innerHTML = '<option value="">All Flavorings</option><option value="none">No Flavoring</option>';
      Array.from(alcohols).sort().forEach(alcohol => {
        const option = document.createElement('option');
        option.value = alcohol;
        option.textContent = alcohol;
        alcoholSelect.appendChild(option);
      });
      console.log('Populated alcohol filter with', alcohols.size, 'options');
    } else {
      console.error('filter-alcohol element not found!');
    }
  }
  
  // Save filter selections to localStorage
  function saveFilters() {
    const filters = {
      fruit: document.getElementById('filter-fruit')?.value || '',
      genre: document.getElementById('filter-genre')?.value || '',
      alcohol: document.getElementById('filter-alcohol')?.value || '',
      size: document.getElementById('filter-size')?.value || ''
    };
    localStorage.setItem('katja-jam-filters', JSON.stringify(filters));
  }
  
  // Load filter selections from localStorage
  function loadSavedFilters() {
    try {
      const saved = localStorage.getItem('katja-jam-filters');
      if (saved) {
        const filters = JSON.parse(saved);
        if (document.getElementById('filter-fruit')) document.getElementById('filter-fruit').value = filters.fruit || '';
        if (document.getElementById('filter-genre')) document.getElementById('filter-genre').value = filters.genre || '';
        if (document.getElementById('filter-alcohol')) document.getElementById('filter-alcohol').value = filters.alcohol || '';
        if (document.getElementById('filter-size')) document.getElementById('filter-size').value = filters.size || '';
        console.log('Loaded saved filters:', filters);
        return true;
      }
    } catch (e) {
      console.error('Error loading saved filters:', e);
    }
    return false;
  }
  
  // Filter products based on selected criteria
  function filterProducts() {
    const fruitFilter = document.getElementById('filter-fruit')?.value || '';
    const genreFilter = document.getElementById('filter-genre')?.value || '';
    const alcoholFilter = document.getElementById('filter-alcohol')?.value || '';
    const sizeFilter = document.getElementById('filter-size')?.value || '';
    
    // Save current filter selection
    saveFilters();
    
    const filtered = {};
    let totalCount = 0;
    
    Object.entries(allProducts).forEach(([name, product]) => {
      // Check signature flavor filters
      if (fruitFilter && product.fruit !== fruitFilter) return;
      if (genreFilter && product.genre !== genreFilter) return;
      if (alcoholFilter === 'none' && product.alcohol) return;
      if (alcoholFilter && alcoholFilter !== 'none' && product.alcohol !== alcoholFilter) return;
      
      // Check jar size filter
      if (sizeFilter && product.inventory[sizeFilter] <= 0) return;
      
      // Product matches all filters
      filtered[name] = product;
      totalCount++;
    });
    
    // Update results count
    const resultsEl = document.getElementById('filter-results');
    if (resultsEl) {
      if (totalCount === 0) {
        resultsEl.innerHTML = '<strong style="color: #dc3545;">No products match your filters</strong>';
      } else {
        resultsEl.textContent = `Showing ${totalCount} of ${Object.keys(allProducts).length} products`;
      }
    }
    
    displayInventory(filtered);
  }
  
  // Reset all filters
  function resetFilters() {
    document.getElementById('filter-fruit').value = '';
    document.getElementById('filter-genre').value = '';
    document.getElementById('filter-alcohol').value = '';
    document.getElementById('filter-size').value = '';
    localStorage.removeItem('katja-jam-filters'); // Clear saved filters
    filterProducts();
  }
  
  /**
   * Create URL-safe ID from product name (matches order-form.js)
   */
  function createProductId(fruit, genre) {
    const productName = `${fruit} ${genre}`;
    return 'product-' + productName.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
  
  // Display inventory in the flavors section
  function displayInventory(products) {
    const container = document.getElementById('jam-inventory');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Check if no products match the filters
    if (Object.keys(products).length === 0) {
      container.innerHTML = `
        <div class="col-12">
          <div class="alert alert-info" style="text-align: center; padding: 30px; margin: 20px 0;">
            <i class="fas fa-search fa-3x" style="color: #17a2b8; margin-bottom: 15px;"></i>
            <h4 style="margin-bottom: 15px;">No Products Match Your Filters</h4>
            <p style="margin-bottom: 20px;">
              We couldn't find any products that match your current filter selection.
            </p>
            <p style="margin-bottom: 20px;">
              <strong>Try:</strong><br>
              • Resetting your filters using the button above<br>
              • Selecting fewer filter criteria<br>
              • Choosing different combinations
            </p>
            <p style="margin-top: 20px; color: #666;">
              <em>Tip: "Custom" flavors are special orders that may not be in our regular inventory. 
              If you're looking for a custom flavor, please <a href="#contact">contact us</a> directly!</em>
            </p>
          </div>
        </div>
      `;
      return;
    }
    
    Object.entries(products).forEach(([name, product]) => {
      const inStock = product.totalJars > 0;
      const stockClass = inStock ? 'in-stock' : 'out-of-stock';
      const productId = createProductId(product.fruit, product.genre);
      
      const productCard = document.createElement('div');
      productCard.className = `col-lg-3 col-md-4 col-sm-6 product-card ${stockClass}`;
      
      productCard.innerHTML = `
        <div class="featurette-icon-container">
          <i class="fas fa-3x fa-jar ${stockClass}"></i>
        </div>
        <div class="section-subheading">
          ${product.fruit} ${product.genre}
        </div>
        <p class="text-muted">
          ${product.alcohol && product.alcohol.toLowerCase() !== 'none' && product.alcohol !== '*None*' ? `<em>${product.alcohol}</em><br>` : ''}
          ${product.ingredients ? `${product.ingredients}<br>` : ''}
        </p>
        <div class="inventory-status">
          ${inStock ? 
            `<strong class="text-success">In Stock</strong>
             <br><a href="#${productId}" class="btn btn-sm btn-primary" style="margin-top: 10px;">
               <i class="fas fa-shopping-cart"></i> Order Now
             </a>` : 
            `<strong class="text-danger">Out of Stock</strong>`
          }
        </div>
      `;
      
      container.appendChild(productCard);
    });
  }
  
  // Fetch and render inventory
  function loadInventory() {
    console.log('Starting inventory fetch from:', SPREADSHEET_URL);
    
    fetch(SPREADSHEET_URL, {
      mode: 'cors',
      headers: {
        'Accept': 'text/plain'
      }
    })
      .then(response => {
        console.log('Fetch response received:', response.status);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text();
      })
      .then(tsv => {
        console.log('TSV data received, length:', tsv.length);
        const data = parseTSV(tsv);
        console.log('Parsed data rows:', data.length);
        allProducts = aggregateInventory(data);
        console.log('Products aggregated:', Object.keys(allProducts).length);
        
        // Populate filter dropdowns
        populateFilters(allProducts);
        
        // Set up filter event listeners
        const fruitFilter = document.getElementById('filter-fruit');
        const genreFilter = document.getElementById('filter-genre');
        const alcoholFilter = document.getElementById('filter-alcohol');
        const sizeFilter = document.getElementById('filter-size');
        const resetBtn = document.getElementById('reset-filters');
        
        if (fruitFilter) fruitFilter.addEventListener('change', filterProducts);
        if (genreFilter) genreFilter.addEventListener('change', filterProducts);
        if (alcoholFilter) alcoholFilter.addEventListener('change', filterProducts);
        if (sizeFilter) sizeFilter.addEventListener('change', filterProducts);
        if (resetBtn) resetBtn.addEventListener('click', resetFilters);
        
        console.log('Event listeners attached:', {
          fruit: !!fruitFilter,
          genre: !!genreFilter,
          alcohol: !!alcoholFilter,
          size: !!sizeFilter,
          reset: !!resetBtn
        });
        
        // Load saved filter selections
        loadSavedFilters();
        
        // Display products with current filter selection (or all if no saved filters)
        filterProducts();
      })
      .catch(error => {
        console.error('Error loading inventory:', error);
        const container = document.getElementById('jam-inventory');
        if (container) {
          container.innerHTML = '<div class="alert alert-warning" style="width: 100%;">' +
            '<p><strong>Inventory temporarily unavailable</strong></p>' +
            '<p>Please check back soon or contact us for current availability.</p>' +
            '<p class="text-muted small">Error: ' + error.message + '</p>' +
            '</div>';
        }
      });
  }
  
  // Load when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadInventory);
  } else {
    loadInventory();
  }
})();
