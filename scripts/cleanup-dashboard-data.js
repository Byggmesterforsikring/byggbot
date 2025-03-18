// cleanup-dashboard-data.js
// Script for å slette dashboard-statistikk eldre enn en gitt dato
// Kjøres med: node scripts/cleanup-dashboard-data.js [YYYY-MM-DD]
// Eksempel: node scripts/cleanup-dashboard-data.js 2025-03-18
//
// MERK: Dette er et administrativt verktøy som ikke pakkes med i Electron-appen.
// Det er kun ment for å kjøres direkte av systemadministratorer.

const path = require('path');
const { pool } = require('../src/electron/config/dbConfig');

// Hent datoen fra kommandolinjeargumenter eller bruk dagens dato som standard
let cutoffDate = process.argv[2];

// Valider dato-formatet (YYYY-MM-DD)
if (cutoffDate) {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(cutoffDate)) {
    console.error('❌ Ugyldig datoformat. Bruk YYYY-MM-DD format, f.eks. 2025-03-18');
    process.exit(1);
  }
} else {
  // Bruk dagens dato som standard
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  cutoffDate = `${year}-${month}-${day}`;
  console.log(`Ingen dato spesifisert, bruker dagens dato: ${cutoffDate}`);
}

async function cleanupDashboardData() {
  console.log(`🧹 Starter opprydding av dashboard-statistikk eldre enn ${cutoffDate}...`);

  try {
    // 1. Vis informasjon om cutoff-datoen
    console.log('\n📅 Dato for sletting:');
    const dateResult = await pool.query('SELECT $1::DATE AS cutoff_date', [cutoffDate]);
    console.table(dateResult.rows);
    
    // 2. Vis antall records før sletting
    console.log('\n📊 Totalt antall records før sletting:');
    const totalResult = await pool.query('SELECT COUNT(*) as totalt_antall_records FROM dashboard_stats');
    console.table(totalResult.rows);
    
    // 3. Vis antall records som vil bli slettet
    console.log('\n🗑️ Records som vil bli slettet:');
    const deleteCountResult = await pool.query(
      'SELECT COUNT(*) as eldre_records_som_slettes FROM dashboard_stats WHERE date < $1::DATE', 
      [cutoffDate]
    );
    console.table(deleteCountResult.rows);
    
    // 4. Slett records eldre enn den angitte datoen
    console.log('\n⏳ Sletter gamle records...');
    const deleteResult = await pool.query(
      'DELETE FROM dashboard_stats WHERE date < $1::DATE', 
      [cutoffDate]
    );
    console.log(`Antall slettede rader: ${deleteResult.rowCount}`);
    
    // 5. Bekreft at slettingen er utført
    console.log('\n✅ Gjenværende records:');
    const remainingResult = await pool.query('SELECT COUNT(*) as gjenværende_records FROM dashboard_stats');
    console.table(remainingResult.rows);
    
    // 6. Vis oversikt over gjenværende records
    console.log('\n📋 Oversikt over gjenværende records:');
    const recordsResult = await pool.query(
      'SELECT date, total_customers, private_customers, business_customers FROM dashboard_stats ORDER BY date'
    );
    console.table(recordsResult.rows);

    console.log('\n✅ Opprydding fullført!');
  } catch (err) {
    console.error('❌ Feil ved opprydding av dashboard-data:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

cleanupDashboardData();