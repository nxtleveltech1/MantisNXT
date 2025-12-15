export type NxtDocumentCopy = {
  companyLines: string[];
  addressLines: string[];
  contactLine: string;
  website: string;
  vatNumber: string;
  bankDetailsLines: string[];
  termsTitle: string;
  termsBodyLines: string[];
  termsUrl: string;
};

/**
 * Default copy pulled from the reference invoice/quotation you provided.
 *
 * If you later want this per-organization, we can move it into org settings/metadata.
 */
export const NXT_DEFAULT_DOCUMENT_COPY: NxtDocumentCopy = {
  companyLines: ['Bright Idea Projects 2765 cc t/a NXT Level Tech'],
  addressLines: [
    'NXT Level Tech - Audio, Lighting and Home Entertainment Equipment',
    'Unit 6 ADF Center Vonkel Street',
    'Saxenburg park 2 Blackheath',
    'Capetown WC 7581',
    'South Africa',
  ],
  contactLine: '(021) 905-8044 / sales@nxtleveltech.co.za',
  website: 'www.nxtleveltech.co.za',
  vatNumber: '4540261817',
  bankDetailsLines: [
    'FNB Cheque Account 623 731 309 14 / Plumstead Branch Code 201109.',
    'NO CASH DEPOSITS ACCEPTED unless deposited into an FNB ADVANCED ATM - NO CHEQUES ACCEPTED',
  ],
  termsTitle: 'TERMS & CONDITIONS APPLY',
  termsBodyLines: [
    'Products carry a 12-month limited warranty against latent manufacturing defects, excluding normal wear and tear or negligent use.',
    'Due to the nature of the products, there is NO WARRANTY on Speakers and Globes.',
    'Deposits are nonrefundable.',
    'Products tested in front of the client and all in working order.',
  ],
  termsUrl: 'https://nxtleveltech.odoo.com/terms',
};


