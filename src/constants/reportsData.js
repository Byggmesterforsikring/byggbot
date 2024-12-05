export const REPORTS_DATA = [
  {
    id: 'policy-history',
    title: 'PolicyHistory',
    content: `# PolicyHistory Report

## Beskrivelse
Rapporten viser alle endringer som er gjort på en forsikringspolise over tid. Dette inkluderer 
endringer i dekning, pris, og andre polisedetaljer.

## Database View
CREATE VIEW vw_PolicyHistory AS
SELECT 
    ph.PolicyHistoryId,
    ph.PolicyId,
    ph.ChangeDate,
    ph.ChangedBy,
    ph.ChangeType,
    ph.OldValue,
    ph.NewValue,
    p.PolicyNumber
FROM 
    PolicyHistory ph
    INNER JOIN Policies p ON ph.PolicyId = p.PolicyId
WHERE 
    ph.IsDeleted = 0`,
    lastUpdated: '2024-02-15'
  },
  // ... flere rapporter
]; 