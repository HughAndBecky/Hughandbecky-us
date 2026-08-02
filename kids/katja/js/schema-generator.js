// Dynamic Schema.org Product markup generator
// Fetches inventory from Google Spreadsheet and generates structured data

const SCHEMA_TSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRGeDZ9VZDliVXZoEUb36lxDC-6VkQSIXt4Q9_V4eswdnwbSJnOJF78Ox_SvYtebvuziOnYVlDOgSve/pub?gid=1393831276&single=true&output=tsv';

// Price map for jar sizes
const JAR_PRICES = {
  '4oz': 6.00,
  '8oz Wide': 9.00,
  '8oz Regular': 9.00,
  '12oz': 12.00,
  '16oz': 15.00
};

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

function getBaseIngredients(fruit, productGenre, alcoholFlavoring) {
  const ingredients = [fruit];
  
  // Standard jam/jelly ingredients
  ingredients.push('Sugar', 'Pectin', 'Lemon Juice');
  
  // Add alcohol flavoring if present
  if (alcoholFlavoring && alcoholFlavoring.trim() !== '') {
    ingredients.push(alcoholFlavoring);
  }
  
  return ingredients;
}

function hasStock(row) {
  // Check Stock columns first, fall back to production count columns
  const stockColumns = ['Stock 4oz', 'Stock 8oz Wide', 'Stock 8oz Regular', 'Stock 12oz', 'Stock 16oz'];
  const productionColumns = ['4oz count', '8oz wide count', '8oz regular count', '12oz count', '16oz count'];
  
  // Try stock columns
  for (const col of stockColumns) {
    const value = parseInt(row[col]);
    if (!isNaN(value) && value > 0) return true;
  }
  
  // Fall back to production columns
  for (const col of productionColumns) {
    const value = parseInt(row[col]);
    if (!isNaN(value) && value > 0) return true;
  }
  
  return false;
}

function generateProductSchema(rows) {
  const products = [];
  const seen = new Set();
  
  rows.forEach(row => {
    const fruit = row['Fruit'] || '';
    const productGenre = row['Product Genre'] || '';
    const alcoholFlavoring = row['Alcohol flavoring'] || '';
    
    if (!fruit || !productGenre) return;
    
    // Create unique key for this product
    const key = `${fruit}_${productGenre}_${alcoholFlavoring || 'none'}`;
    if (seen.has(key)) return;
    seen.add(key);
    
    // Build product name
    let productName = fruit;
    if (alcoholFlavoring && alcoholFlavoring.trim() !== '') {
      productName += ` ${alcoholFlavoring}`;
    }
    productName += ` ${productGenre}`;
    
    // Get ingredients
    const ingredients = getBaseIngredients(fruit, productGenre, alcoholFlavoring);
    
    // Determine availability
    const inStock = hasStock(row);
    const availability = inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock';
    
    // Create product schema
    const product = {
      '@type': 'Product',
      'name': productName,
      'description': `Small batch ${productGenre.toLowerCase()} made from fresh ${fruit.toLowerCase()}`,
      'category': productGenre,
      'brand': {
        '@type': 'Brand',
        'name': 'Can Do It'
      },
      'recipeIngredient': ingredients,
      'offers': {
        '@type': 'AggregateOffer',
        'lowPrice': '6.00',
        'highPrice': '15.00',
        'priceCurrency': 'USD',
        'availability': availability
      }
    };
    
    products.push(product);
  });
  
  return products;
}

function injectSchemaMarkup(products) {
  // Create ItemList schema
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'itemListElement': products
  };
  
  // Create script element
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(schema, null, 2);
  
  // Append to head
  document.head.appendChild(script);
}

async function generateSchema() {
  try {
    const response = await fetch(SCHEMA_TSV_URL);
    const tsv = await response.text();
    const rows = parseTSV(tsv);
    const products = generateProductSchema(rows);
    
    if (products.length > 0) {
      injectSchemaMarkup(products);
      console.log(`Generated Schema.org markup for ${products.length} products`);
    }
  } catch (error) {
    console.error('Failed to generate Schema.org markup:', error);
  }
}

// Generate schema when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', generateSchema);
} else {
  generateSchema();
}
