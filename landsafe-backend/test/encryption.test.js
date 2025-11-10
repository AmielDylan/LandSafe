const { encryptFile, decryptFile, generateSecurePassword } = require('../utils/encryption');
const assert = require('assert');

console.log('\n🧪 Tests du module de chiffrement\n');
console.log('═══════════════════════════════════════════════\n');

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    testsPassed++;
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   Erreur: ${error.message}`);
    testsFailed++;
  }
}

// Test 1 : Chiffrer puis déchiffrer
test('Test 1 : Chiffrer puis déchiffrer', () => {
  const testData = Buffer.from('Contenu test document foncier confidentiel');
  const password = 'MonMotDePasseSuperSecret123!';

  const { encryptedBuffer, metadata } = encryptFile(testData, password);
  
  assert.ok(metadata.originalSize > 0, 'Taille originale doit être > 0');
  assert.ok(metadata.encryptedSize > metadata.originalSize, 'Taille chiffrée doit être > taille originale');
  assert.equal(metadata.algorithm, 'aes-256-gcm', 'Algorithme doit être aes-256-gcm');
});

// Test 2 : Vérifier que le contenu est différent
test('Test 2 : Contenu modifié par chiffrement', () => {
  const testData = Buffer.from('Contenu test document foncier confidentiel');
  const password = 'MonMotDePasseSuperSecret123!';

  const { encryptedBuffer } = encryptFile(testData, password);
  
  assert.notEqual(testData.toString(), encryptedBuffer.toString(), 'Contenu chiffré doit être différent de l\'original');
});

// Test 3 : Déchiffrer
test('Test 3 : Déchiffrement OK', () => {
  const testData = Buffer.from('Contenu test document foncier confidentiel');
  const password = 'MonMotDePasseSuperSecret123!';

  const { encryptedBuffer } = encryptFile(testData, password);
  const { decryptedBuffer } = decryptFile(encryptedBuffer, password);
  
  assert.ok(decryptedBuffer, 'Buffer déchiffré doit exister');
});

// Test 4 : Vérifier que le contenu déchiffré = original
test('Test 4 : Contenu restauré identique', () => {
  const testData = Buffer.from('Contenu test document foncier confidentiel');
  const password = 'MonMotDePasseSuperSecret123!';

  const { encryptedBuffer } = encryptFile(testData, password);
  const { decryptedBuffer } = decryptFile(encryptedBuffer, password);
  
  assert.equal(testData.toString(), decryptedBuffer.toString(), 'Contenu déchiffré doit être identique à l\'original');
});

// Test 5 : Mauvais mot de passe
test('Test 5 : Mauvais mot de passe rejeté', () => {
  const testData = Buffer.from('Contenu test document foncier confidentiel');
  const password = 'MonMotDePasseSuperSecret123!';
  const wrongPassword = 'mauvais_mdp';

  const { encryptedBuffer } = encryptFile(testData, password);
  
  let errorThrown = false;
  try {
    decryptFile(encryptedBuffer, wrongPassword);
  } catch (error) {
    errorThrown = true;
    assert.ok(error.message.includes('Mot de passe incorrect') || error.message.includes('authenticate'), 
      'Erreur doit indiquer mot de passe incorrect');
  }
  
  assert.ok(errorThrown, 'Déchiffrement avec mauvais mot de passe doit échouer');
});

// Test 6 : Génération mot de passe
test('Test 6 : Génération mot de passe OK', () => {
  const generatedPwd = generateSecurePassword();
  
  assert.ok(generatedPwd.length > 40, 'Mot de passe généré doit faire > 40 caractères');
  assert.ok(typeof generatedPwd === 'string', 'Mot de passe doit être une chaîne');
});

// Test 7 : Deux chiffrements = résultats différents (salt/IV aléatoires)
test('Test 7 : Salt/IV aléatoires (deux chiffrements ≠)', () => {
  const testData = Buffer.from('Contenu test document foncier confidentiel');
  const password = 'MonMotDePasseSuperSecret123!';

  const { encryptedBuffer: encrypted1 } = encryptFile(testData, password);
  const { encryptedBuffer: encrypted2 } = encryptFile(testData, password);
  
  assert.notEqual(encrypted1.toString(), encrypted2.toString(), 
    'Deux chiffrements du même fichier doivent produire des résultats différents (salt/IV aléatoires)');
});

// Test 8 : Fichier vide
test('Test 8 : Chiffrement fichier vide', () => {
  const testData = Buffer.from('');
  const password = 'MonMotDePasseSuperSecret123!';

  const { encryptedBuffer, metadata } = encryptFile(testData, password);
  const { decryptedBuffer } = decryptFile(encryptedBuffer, password);
  
  assert.equal(testData.length, decryptedBuffer.length, 'Fichier vide doit rester vide après déchiffrement');
});

// Test 9 : Fichier volumineux (simulation)
test('Test 9 : Chiffrement fichier volumineux', () => {
  const testData = Buffer.alloc(1024 * 100, 'A'); // 100 KB
  const password = 'MonMotDePasseSuperSecret123!';

  const { encryptedBuffer, metadata } = encryptFile(testData, password);
  const { decryptedBuffer } = decryptFile(encryptedBuffer, password);
  
  assert.equal(testData.length, decryptedBuffer.length, 'Taille doit être préservée');
  assert.equal(testData.toString(), decryptedBuffer.toString(), 'Contenu doit être identique');
});

// Résumé
console.log('\n═══════════════════════════════════════════════');
console.log(`✅ Tests réussis : ${testsPassed}`);
if (testsFailed > 0) {
  console.log(`❌ Tests échoués : ${testsFailed}`);
}
console.log('═══════════════════════════════════════════════\n');

if (testsFailed === 0) {
  console.log('🎉 TOUS LES TESTS PASSENT ! 🎉\n');
  process.exit(0);
} else {
  console.log('❌ Certains tests ont échoué\n');
  process.exit(1);
}

