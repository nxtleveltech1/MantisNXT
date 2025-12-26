-- Final Supplier Import Completion Script
-- Completes remaining tasks from bulk import
-- Date: 2025-12-26

BEGIN;

-- Update performance tiers based on CSV data
-- This uses a more comprehensive mapping based on actual CSV codes

-- TIER 1 (Platinum) suppliers
UPDATE public.supplier s
SET performance_tier = 'platinum'::supplier_performance_tier
FROM core.supplier cs
WHERE s.id = cs.supplier_id
  AND cs.code IN (
    'VIV33130', 'AUD10', 'STA8', 'PLA33187', 'PRO33058', 'BC903', 'VEN34214',
    'GLO33029', 'DES33013', 'BER906', 'MUS33049', 'ROC12', 'ROL33060',
    'LEG33038', 'AUD896', 'SON18', 'PLA17', 'SEN33068', 'MCR37966',
    'MUS33048', 'ALP886', 'IMS34231', 'SPE33076', 'APE892', 'TUE925',
    'MARMUS0076', 'STA14', 'CYB918', 'MAN33042', 'SCO33064', 'STA33812',
    'URB36689', 'ACT885', 'DWR33018', 'LIN21', 'PHD37552', 'JDG28576',
    'CRA26812', 'CON913', 'FOA33025', 'NDO33208', 'GAR27769', 'BOU35131',
    'CAP27258', 'CIT38334', 'GAR27778', 'ATO25917', 'PHA37158', 'BRA26197',
    'SEG33066', 'BAT902', 'FIR34391', 'JUS34303', 'PEN33053', 'SC33063',
    'TIM33084', 'AV900', 'ARI34016', 'BP25982', 'BRA26198', 'ELE36593',
    'ESQ36501', 'RIC31109', 'RUD27489', 'TOP35854', 'CRA26822', 'DEB35559',
    'ELE33021', 'FAL36111', 'GAD34515', 'GIP38574', 'LL38260', 'MVE33089',
    'RAN30904', 'TOA36799', 'TAK31994'
  );

-- TIER 2 (Gold) suppliers
UPDATE public.supplier s
SET performance_tier = 'gold'::supplier_performance_tier
FROM core.supplier cs
WHERE s.id = cs.supplier_id
  AND cs.code IN (
    'COM33419', 'CON37671', 'ENR27482', 'INH33032', 'JOH35248', 'LC33070',
    'NTA33209', 'PRO37406', 'SIV35150', 'SMO33069', 'SOL36815', 'TAW37819',
    'VIV924', 'VOL16', 'ANC890', 'ANI897', 'BEN34286', 'BOL34610', 'EF27316',
    'ERI32036', 'EUG38739', 'EVE33023', 'FAN27611', 'IMI39040', 'LIN33039',
    'LUL29508', 'NXT1', 'OMN34917', 'PEN33880', 'ROT33061', 'ROZ33788',
    'SEC919', 'SHA38995', 'SID35185', 'SUR35291', 'SWE33379', 'TO33651'
  );

-- TIER 3 (Silver) suppliers
UPDATE public.supplier s
SET performance_tier = 'silver'::supplier_performance_tier
FROM core.supplier cs
WHERE s.id = cs.supplier_id
  AND cs.code IN (
    'A138457', 'ABD35460', 'BAS33374', 'CAM37707', 'CHR34181', 'CHR26584',
    'CHR37764', 'DJ27208', 'DON34408', 'DEA27012', 'EMI27451', 'EUG27558',
    'FIN35552', 'FIX34176', 'GAD35404', 'REG: 2019/218314/07', 'JKM28676',
    'JET35975', 'KEV38226', 'KIR36176', 'MM33145', 'MAS38616', 'PLU38509',
    'PLA33186', 'RUD27768', 'SOU38894', 'SEC36120', 'SHA33655', 'SIN35287',
    'SOU34594', 'TVR34578', 'TED37369', 'THE33297', 'THE32142', 'TUB36049',
    'YAS32766', 'ADR887', 'ADR25443', 'ALA33316', 'ALE35224', 'ALT888',
    'AND891', 'AND916', 'AUD894', 'AUD898', 'BRI908', 'BAL901', 'BEG904',
    'BEN34205', 'BK35140', 'BLA33342', 'BRI38458', 'CBS38506', 'COR915',
    'CPL917', 'CAP909', 'CAP26364', 'CAS910', 'CAS24', 'CHR907', 'CLI9',
    'CLI911', 'CLU33517', 'CON912', 'COW34175', 'DVC33017', 'DAN26898',
    'DAN26914', 'DAT33012', 'DIE36177', 'DIG33730', 'DIR33014', 'DRI33015',
    'DUX33016', 'EMA38405', 'EMA38406', 'EAS33019', 'ECO33020', 'ENR27476',
    'ERI34431', 'ERW36555', 'EUR33022', 'FOR33027', 'FIN33024', 'FOR33026'
  );

-- Update preferred_supplier flag for platinum tier suppliers
UPDATE public.supplier
SET preferred_supplier = true
WHERE performance_tier = 'platinum'::supplier_performance_tier;

-- Process remaining bank details from CSV
-- Note: These would need to be extracted from CSV bank_details_json column
-- For now, we've processed the main ones manually

-- Ensure all suppliers have performance records
INSERT INTO public.supplier_performance (
  supplier_id, overall_rating, quality_rating, delivery_rating, 
  service_rating, price_rating
)
SELECT 
  cs.supplier_id,
  0.00, 0.00, 0.00, 0.00, 0.00
FROM core.supplier cs
WHERE cs.org_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
  AND cs.supplier_id NOT IN (
    SELECT supplier_id FROM public.supplier_performance
  )
ON CONFLICT DO NOTHING;

COMMIT;

-- Verification queries (run separately)
-- SELECT COUNT(*) FROM core.supplier WHERE org_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid;
-- SELECT performance_tier, COUNT(*) FROM public.supplier GROUP BY performance_tier;
-- SELECT COUNT(*) FROM public.supplier_addresses;
-- SELECT COUNT(*) FROM public.supplier_contacts;
-- SELECT COUNT(*) FROM public.supplier_performance;

