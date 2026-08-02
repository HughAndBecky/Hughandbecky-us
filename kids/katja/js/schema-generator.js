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
  const productsByCategory = {
    'Jam': [],
    'Jelly': [],
    'Butter': []
  };
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
    
    // Get stock for each size
    const getStock = (col, prodCol) => parseInt(row[col]) || parseInt(row[prodCol]) || 0;
    const stock = {
      '4oz': getStock('Stock 4oz', '4oz count'),
      '8oz Wide': getStock('Stock 8oz Wide', '8oz wide count'),
      '8oz Regular': getStock('Stock 8oz Regular', '8oz regular count'),
      '12oz': getStock('Stock 12oz', '12oz count'),
      '16oz': getStock('Stock 16oz', '16oz count')
    };
    
    // Create individual Offer objects for each available size
    const offers = [];
    for (const [size, qty] of Object.entries(stock)) {
      if (JAR_PRICES[size]) {
        offers.push({
          '@type': 'Offer',
          'name': `${productName} - ${size}`,
          'price': JAR_PRICES[size].toFixed(2),
          'priceCurrency': 'USD',
          'availability': qty > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          'businessFunction': 'http://purl.org/goodrelations/v1#Sell',
          'itemOffered': {
            '@type': 'Product',
            'name': `${productName} - ${size}`,
            'description': `${size} jar of ${productName.toLowerCase()}`
          },
          'seller': {
            '@type': 'LocalBusiness',
            'name': 'Can Do It - Small Batch Spreads',
            'url': 'https://hughandbecky.us/kids/katja/can-do-it/'
          },
          'itemCondition': 'https://schema.org/NewCondition',
          'acceptedPaymentMethod': [
            'http://purl.org/goodrelations/v1#Cash',
            'http://purl.org/goodrelations/v1#PayPal'
          ],
          'availableDeliveryMethod': [
            'http://purl.org/goodrelations/v1#DeliverModePickUp',
            'http://purl.org/goodrelations/v1#DeliverModeOwnFleet'
          ]
        });
      }
    }
    
    // Determine overall availability
    const inStock = Object.values(stock).some(qty => qty > 0);
    
    // Determine which ProductGroup this belongs to
    const productGroupMap = {
      'Jam': {
        '@type': 'ProductGroup',
        'name': 'Artisan Jams',
        'url': 'https://hughandbecky.us/kids/katja/can-do-it/#jams'
      },
      'Jelly': {
        '@type': 'ProductGroup',
        'name': 'Artisan Jellies',
        'url': 'https://hughandbecky.us/kids/katja/can-do-it/#jellies'
      },
      'Butter': {
        '@type': 'ProductGroup',
        'name': 'Artisan Fruit Butters',
        'url': 'https://hughandbecky.us/kids/katja/can-do-it/#butters'
      }
    };
    
    // Create product schema
    const product = {
      '@type': 'Product',
      'name': productName,
      'description': `Small batch ${productGenre.toLowerCase()} made from fresh ${fruit.toLowerCase()}`,
      'image': 'https://hughandbecky.us/kids/katja/media/Jam-Photos/jar-sizes.jpg',
      'category': productGenre,
      'isVariantOf': productGroupMap[productGenre] || null,
      'brand': {
        '@type': 'Brand',
        'name': 'Can Do It'
      },
      'recipeIngredient': ingredients,
      'offers': offers.length > 1 ? {
        '@type': 'AggregateOffer',
        'offers': offers,
        'lowPrice': Math.min(...offers.map(o => parseFloat(o.price))).toFixed(2),
        'highPrice': Math.max(...offers.map(o => parseFloat(o.price))).toFixed(2),
        'priceCurrency': 'USD',
        'availability': inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        'offerCount': offers.length
      } : offers.length === 1 ? offers[0] : {
        '@type': 'Offer',
        'price': Math.min(...Object.values(JAR_PRICES)).toFixed(2),
        'priceCurrency': 'USD',
        'availability': 'https://schema.org/OutOfStock'
      }
    };
    
    // Add to appropriate category
    if (productsByCategory[productGenre]) {
      productsByCategory[productGenre].push(product);
    }
  });
  
  return productsByCategory;
}

function injectSchemaMarkup(productsByCategory) {
  const productGroups = [];
  
  // Create ProductGroup for Jams
  if (productsByCategory['Jam'] && productsByCategory['Jam'].length > 0) {
    productGroups.push({
      '@type': 'ProductGroup',
      'name': 'Artisan Jams',
      'description': 'Small batch artisan jams made from fresh fruit',
      'url': 'https://hughandbecky.us/kids/katja/can-do-it/#jams',
      'sameAs': 'https://www.wikidata.org/wiki/Q1269',
      'brand': {
        '@type': 'Brand',
        'name': 'Can Do It'
      },
      'hasVariant': productsByCategory['Jam']
    });
  }
  
  // Create ProductGroup for Jellies
  if (productsByCategory['Jelly'] && productsByCategory['Jelly'].length > 0) {
    productGroups.push({
      '@type': 'ProductGroup',
      'name': 'Artisan Jellies',
      'description': 'Small batch artisan jellies made from fresh fruit',
      'url': 'https://hughandbecky.us/kids/katja/can-do-it/#jellies',
      'sameAs': 'https://www.wikidata.org/wiki/Q20579575',
      'brand': {
        '@type': 'Brand',
        'name': 'Can Do It'
      },
      'hasVariant': productsByCategory['Jelly']
    });
  }
  
  // Create ProductGroup for Butters
  if (productsByCategory['Butter'] && productsByCategory['Butter'].length > 0) {
    productGroups.push({
      '@type': 'ProductGroup',
      'name': 'Artisan Fruit Butters',
      'description': 'Small batch artisan fruit butters',
      'url': 'https://hughandbecky.us/kids/katja/can-do-it/#butters',
      'sameAs': 'https://www.wikidata.org/wiki/Q259550',
      'brand': {
        '@type': 'Brand',
        'name': 'Can Do It'
      },
      'hasVariant': productsByCategory['Butter']
    });
  }
  
  // Create ItemList containing all ProductGroups
  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'name': 'Can Do It Product Catalog',
    'description': 'Small batch artisan fruit spreads organized by category',
    'numberOfItems': productGroups.length,
    'itemListElement': productGroups.map((group, index) => ({
      '@type': 'ListItem',
      'position': index + 1,
      'item': group
    }))
  };
  
  // Create OfferCatalog
  const offerCatalogSchema = {
    '@context': 'https://schema.org',
    '@type': 'OfferCatalog',
    'name': 'Can Do It - Small Batch Spreads Catalog',
    'description': 'Complete catalog of artisan jams, jellies, and fruit butters available for purchase',
    'url': 'https://hughandbecky.us/kids/katja/can-do-it/',
    'publisher': {
      '@type': 'LocalBusiness',
      'name': 'Can Do It - Small Batch Spreads',
      'url': 'https://hughandbecky.us/kids/katja/can-do-it/'
    },
    'itemListElement': productGroups.map((group, index) => ({
      '@type': 'ListItem',
      'position': index + 1,
      'item': group
    }))
  };
  
  // Create script element for ItemList
  const itemListScript = document.createElement('script');
  itemListScript.type = 'application/ld+json';
  itemListScript.id = 'product-itemlist-schema';
  itemListScript.textContent = JSON.stringify(itemListSchema, null, 2);
  
  // Create script element for OfferCatalog
  const offerCatalogScript = document.createElement('script');
  offerCatalogScript.type = 'application/ld+json';
  offerCatalogScript.id = 'offer-catalog-schema';
  offerCatalogScript.textContent = JSON.stringify(offerCatalogSchema, null, 2);
  
  // Append to head
  document.head.appendChild(itemListScript);
  document.head.appendChild(offerCatalogScript);
  
  const totalProducts = Object.values(productsByCategory).reduce((sum, arr) => sum + arr.length, 0);
  console.log(`Schema.org markup injected: ${productGroups.length} ProductGroups (OfferCatalog + ItemList) with ${totalProducts} total products`);
}

async function generateSchema() {
  try {
    const response = await fetch(SCHEMA_TSV_URL);
    const tsv = await response.text();
    const rows = parseTSV(tsv);
    const productsByCategory = generateProductSchema(rows);
    
    // Check if there are any products in any category
    const totalProducts = Object.values(productsByCategory).reduce((sum, arr) => sum + arr.length, 0);
    
    if (totalProducts > 0) {
      injectSchemaMarkup(productsByCategory);
    } else {
      console.log('No products found to generate schema');
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
