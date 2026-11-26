const { execFileSync } = require('node:child_process');

function fixtureSql(id) {
  const filter = id ? "AND c.slug = 'e2e-" + id + "'" : '';
  return `
    BEGIN;
    CREATE TEMP TABLE trial_categories AS
      SELECT c.id, substr(c.slug, 5) AS suffix
      FROM "Category" c
      WHERE c."parentId" IS NULL
        AND c.slug ~ '^e2e-[0-9]{13}-[a-z0-9]{6}$'
        AND c.path = '/catalog/' || c.slug || '/'
        AND c.name = 'E2E категория ' || substr(c.slug, 5)
        ${filter};

    CREATE TEMP TABLE trial_products AS
      SELECT p.id
      FROM "Product" p
      JOIN trial_categories c ON p."categoryId" = c.id
      WHERE p.sku = 'E2E-' || c.suffix
        AND p.slug = 'e2e-product-' || c.suffix
        AND p.name = 'E2E товар ' || c.suffix
        AND p.path = '/catalog/e2e-' || c.suffix || '/' || p.slug || '/'
        AND NOT EXISTS (SELECT 1 FROM "Variant" v WHERE v."productId" = p.id)
        AND NOT EXISTS (SELECT 1 FROM "OrderLine" l WHERE l."productId" = p.id);

    DELETE FROM "Product" p USING trial_products t WHERE p.id = t.id;
    DELETE FROM "Category" c USING trial_categories t
      WHERE c.id = t.id
        AND NOT EXISTS (SELECT 1 FROM "Product" p WHERE p."categoryId" = c.id)
        AND NOT EXISTS (SELECT 1 FROM "Category" child WHERE child."parentId" = c.id);
    COMMIT;
  `;
}

function fixtureDatabase(sql) {
  const containers = execFileSync('docker', ['ps', '-q',
    '--filter', 'label=com.docker.compose.project=favorit-e2e',
    '--filter', 'label=com.docker.compose.service=db',
  ], { encoding: 'utf8' }).trim().split(/\s+/);
  if (containers.length !== 1 || !/^[a-f0-9]{12,64}$/.test(containers[0])) {
    throw new Error('Expected one database container in favorit-e2e');
  }
  return execFileSync('docker', ['exec', '-i', containers[0], 'psql',
    '-X', '-A', '-t', '-U', 'favorit', '-d', 'favorit', '-v', 'ON_ERROR_STOP=1',
  ], { input: sql, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
}

function removeCatalogFixture(id) {
  if (!/^[0-9]{13}-[a-z0-9]{6}$/.test(id)) throw new Error('Invalid catalog fixture ID');
  fixtureDatabase(fixtureSql(id));
}

module.exports = { removeCatalogFixture, fixtureSql, fixtureDatabase };
