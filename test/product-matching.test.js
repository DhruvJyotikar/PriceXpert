const test = require('node:test');
const assert = require('node:assert/strict');
const { extractProductIdentity, candidateMatchScore, searchQuery, validatePincode, browserSelectors } = require('../server');

test('structured phone query rejects accessories and retains the exact device', () => {
  const identity = extractProductIdentity('Apple iPhone 17 256GB Blue with A19 chip', { price: 89900 });
  assert.equal(searchQuery(identity), 'apple iphone 17 256gb blue');
  assert.equal(candidateMatchScore('Spigen case cover for Apple iPhone 17 256GB Blue', identity), 0);
  assert.ok(candidateMatchScore('Apple iPhone 17 256GB Blue', identity) >= 80);
});

test('Amazon page title/spec storage is represented in the detected variant', () => {
  const identity = extractProductIdentity('Samsung Galaxy S25 256GB Navy', { storage: '256 GB', price: 74999 });
  assert.equal(identity.brand, 'samsung');
  assert.equal(identity.model, 'galaxy s25');
  assert.ok(identity.variant.includes('256gb'));
});
test('matching rejects a different capacity and a different model edition', () => {
  const identity = extractProductIdentity('Apple iPhone 17 256GB Blue');
  assert.equal(candidateMatchScore('Apple iPhone 17 128GB Blue', identity), 0);
  assert.equal(candidateMatchScore('Apple iPhone 17 Pro 256GB Blue', identity), 0);
  assert.ok(candidateMatchScore('Apple iPhone 17 256 GB Blue', identity) >= 90);
});

test('identity retains RAM, color, condition, and pincode validation', () => {
  const identity = extractProductIdentity('Samsung Galaxy S25 5G Navy 256 GB 12 GB RAM Renewed');
  assert.equal(identity.brand, 'samsung');
  assert.equal(identity.attributes.storage, '256gb');
  assert.equal(identity.attributes.ram, '12gb');
  assert.equal(identity.attributes.color, 'blue');
  assert.equal(identity.attributes.condition, 'renewed');
  assert.equal(validatePincode('560001'), '560001');
  assert.equal(validatePincode('56001'), null);
});

test('browser selector payload excludes non-serializable platform functions', () => {
  const selectors = browserSelectors({ search: () => 'https://example.com', title: ['h1'], cards: ['article'] });
  assert.deepEqual(selectors, { title: ['h1'], cards: ['article'] });
  assert.doesNotThrow(() => JSON.stringify(selectors));
});

test('footwear and apparel titles with gender prefixes extract the brand and model correctly', () => {
  const puma = extractProductIdentity('Puma Unisex-Adult Smashic Black Matte Sneaker', { color: 'black' });
  assert.equal(puma.brand, 'puma');
  assert.equal(puma.model, 'smashic');
  assert.equal(puma.attributes.gender, 'unisex');
  assert.equal(puma.attributes.color, 'black');
  assert.ok(puma.model.length > 0);
  assert.ok(puma.brand.length > 0);

  const kayzer = extractProductIdentity('PUMA Unisex-Adult Club Kayzer Sneakers');
  assert.equal(kayzer.brand, 'puma');
  assert.ok(kayzer.model.includes('club kayzer'));
});
