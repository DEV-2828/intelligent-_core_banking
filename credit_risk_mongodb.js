// Intelligent Core Banking & Commercial Credit Risk Engine
// MongoDB 6/7+ credit-risk database setup and demo analytics

const riskDB = db.getSiblingDB('credit_risk_engine');

riskDB.credit_profiles.drop();

riskDB.createCollection('credit_profiles', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: [
        'borrower_id', 'entity_type', 'legal_name', 'tax_identifier',
        'credit_bureau_payload', 'financial_statements', 'underwriting_status', 'updated_at'
      ],
      properties: {
        borrower_id: { bsonType: 'string' },
        entity_type: { enum: ['RETAIL', 'SME', 'CORPORATE'] },
        legal_name: { bsonType: 'string' },
        tax_identifier: { bsonType: 'string' },
        underwriting_status: { enum: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'] },
        approved_loan_id: { bsonType: ['string', 'null'] },
        credit_bureau_payload: {
          bsonType: 'object',
          required: ['bureau_name', 'score', 'delinquencies_24m'],
          properties: {
            bureau_name: { bsonType: 'string' },
            score: { bsonType: 'int', minimum: 300, maximum: 900 },
            delinquencies_24m: { bsonType: 'int', minimum: 0 }
          }
        },
        financial_statements: {
          bsonType: 'array',
          minItems: 1,
          items: {
            bsonType: 'object',
            required: [
              'fiscal_year', 'fiscal_quarter', 'revenue', 'operating_expenses',
              'net_operating_income', 'operating_cash_flow', 'total_debt_service',
              'short_term_liabilities', 'total_assets'
            ],
            properties: {
              fiscal_year: { bsonType: 'int' },
              fiscal_quarter: { bsonType: 'int', minimum: 1, maximum: 4 },
              revenue: { bsonType: 'decimal' },
              operating_expenses: { bsonType: 'decimal' },
              net_operating_income: { bsonType: 'decimal' },
              operating_cash_flow: { bsonType: 'decimal' },
              total_debt_service: { bsonType: 'decimal' },
              short_term_liabilities: { bsonType: 'decimal' },
              total_assets: { bsonType: 'decimal' }
            }
          }
        },
        updated_at: { bsonType: 'date' }
      }
    }
  },
  validationLevel: 'strict',
  validationAction: 'error'
});

riskDB.credit_profiles.createIndex({ borrower_id: 1 }, { unique: true });
riskDB.credit_profiles.createIndex({ tax_identifier: 1 }, { unique: true });
riskDB.credit_profiles.createIndex({ entity_type: 1, underwriting_status: 1 });
riskDB.credit_profiles.createIndex({ 'credit_bureau_payload.score': -1 });

riskDB.credit_profiles.insertMany([
  {
    _id: ObjectId('66ff00000000000000000001'),
    borrower_id: '11111111-1111-4111-8111-111111111111',
    entity_type: 'SME',
    legal_name: 'Arjun Trading Enterprises',
    tax_identifier: 'GSTIN-DEMO-ARJUN-01',
    underwriting_status: 'APPROVED',
    approved_loan_id: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1',
    credit_bureau_payload: {
      bureau_name: 'DemoBureau',
      score: NumberInt(782),
      delinquencies_24m: NumberInt(0)
    },
    financial_statements: [
      { fiscal_year: 2025, fiscal_quarter: 4, revenue: NumberDecimal('2600000.00'), operating_expenses: NumberDecimal('1900000.00'), net_operating_income: NumberDecimal('700000.00'), operating_cash_flow: NumberDecimal('620000.00'), total_debt_service: NumberDecimal('280000.00'), short_term_liabilities: NumberDecimal('900000.00'), total_assets: NumberDecimal('2600000.00') },
      { fiscal_year: 2026, fiscal_quarter: 1, revenue: NumberDecimal('2750000.00'), operating_expenses: NumberDecimal('1980000.00'), net_operating_income: NumberDecimal('770000.00'), operating_cash_flow: NumberDecimal('690000.00'), total_debt_service: NumberDecimal('290000.00'), short_term_liabilities: NumberDecimal('920000.00'), total_assets: NumberDecimal('2750000.00') },
      { fiscal_year: 2026, fiscal_quarter: 2, revenue: NumberDecimal('2900000.00'), operating_expenses: NumberDecimal('2050000.00'), net_operating_income: NumberDecimal('850000.00'), operating_cash_flow: NumberDecimal('760000.00'), total_debt_service: NumberDecimal('300000.00'), short_term_liabilities: NumberDecimal('950000.00'), total_assets: NumberDecimal('2900000.00') },
      { fiscal_year: 2026, fiscal_quarter: 3, revenue: NumberDecimal('3050000.00'), operating_expenses: NumberDecimal('2140000.00'), net_operating_income: NumberDecimal('910000.00'), operating_cash_flow: NumberDecimal('805000.00'), total_debt_service: NumberDecimal('310000.00'), short_term_liabilities: NumberDecimal('970000.00'), total_assets: NumberDecimal('3100000.00') }
    ],
    updated_at: new Date()
  },
  {
    _id: ObjectId('66ff00000000000000000002'),
    borrower_id: '22222222-2222-4222-8222-222222222222',
    entity_type: 'SME',
    legal_name: 'Neha Manufacturing Works',
    tax_identifier: 'GSTIN-DEMO-NEHA-02',
    underwriting_status: 'UNDER_REVIEW',
    approved_loan_id: null,
    credit_bureau_payload: {
      bureau_name: 'DemoBureau',
      score: NumberInt(716),
      delinquencies_24m: NumberInt(1)
    },
    financial_statements: [
      { fiscal_year: 2025, fiscal_quarter: 4, revenue: NumberDecimal('1800000.00'), operating_expenses: NumberDecimal('1450000.00'), net_operating_income: NumberDecimal('350000.00'), operating_cash_flow: NumberDecimal('300000.00'), total_debt_service: NumberDecimal('250000.00'), short_term_liabilities: NumberDecimal('780000.00'), total_assets: NumberDecimal('1500000.00') },
      { fiscal_year: 2026, fiscal_quarter: 1, revenue: NumberDecimal('1850000.00'), operating_expenses: NumberDecimal('1490000.00'), net_operating_income: NumberDecimal('360000.00'), operating_cash_flow: NumberDecimal('310000.00'), total_debt_service: NumberDecimal('255000.00'), short_term_liabilities: NumberDecimal('790000.00'), total_assets: NumberDecimal('1540000.00') },
      { fiscal_year: 2026, fiscal_quarter: 2, revenue: NumberDecimal('1920000.00'), operating_expenses: NumberDecimal('1530000.00'), net_operating_income: NumberDecimal('390000.00'), operating_cash_flow: NumberDecimal('330000.00'), total_debt_service: NumberDecimal('260000.00'), short_term_liabilities: NumberDecimal('810000.00'), total_assets: NumberDecimal('1600000.00') },
      { fiscal_year: 2026, fiscal_quarter: 3, revenue: NumberDecimal('2000000.00'), operating_expenses: NumberDecimal('1580000.00'), net_operating_income: NumberDecimal('420000.00'), operating_cash_flow: NumberDecimal('350000.00'), total_debt_service: NumberDecimal('265000.00'), short_term_liabilities: NumberDecimal('830000.00'), total_assets: NumberDecimal('1680000.00') }
    ],
    updated_at: new Date()
  }
]);

// ---------- DSCR: trailing four quarters ----------
print('\nDSCR ANALYTICS');
riskDB.credit_profiles.aggregate([
  { $unwind: '$financial_statements' },
  { $sort: { borrower_id: 1, 'financial_statements.fiscal_year': -1, 'financial_statements.fiscal_quarter': -1 } },
  {
    $group: {
      _id: '$borrower_id',
      legal_name: { $first: '$legal_name' },
      statements: { $push: '$financial_statements' }
    }
  },
  { $project: { legal_name: 1, latest_four: { $slice: ['$statements', 4] } } },
  { $unwind: '$latest_four' },
  {
    $group: {
      _id: '$_id',
      legal_name: { $first: '$legal_name' },
      ttm_noi: { $sum: '$latest_four.net_operating_income' },
      ttm_debt_service: { $sum: '$latest_four.total_debt_service' }
    }
  },
  {
    $project: {
      legal_name: 1,
      ttm_noi: 1,
      ttm_debt_service: 1,
      dscr: {
        $cond: [
          { $eq: ['$ttm_debt_service', NumberDecimal('0.00')] },
          null,
          { $round: [{ $divide: ['$ttm_noi', '$ttm_debt_service'] }, 2] }
        ]
      }
    }
  }
]).forEach(doc => printjson(doc));

// ---------- OCF margin by borrower ----------
print('\nOCF MARGIN ANALYTICS');
riskDB.credit_profiles.aggregate([
  { $unwind: '$financial_statements' },
  {
    $group: {
      _id: '$borrower_id',
      legal_name: { $first: '$legal_name' },
      total_ocf: { $sum: '$financial_statements.operating_cash_flow' },
      total_revenue: { $sum: '$financial_statements.revenue' }
    }
  },
  {
    $project: {
      legal_name: 1,
      ocf_margin_percentage: {
        $round: [
          {
            $multiply: [
              { $cond: [{ $eq: ['$total_revenue', NumberDecimal('0.00')] }, 0, { $divide: ['$total_ocf', '$total_revenue'] }] },
              100
            ]
          },
          2
        ]
      }
    }
  }
]).forEach(doc => printjson(doc));

// ---------- Composite credit-risk score ----------
// Weighting used for project demo: bureau 30%, DSCR 40%, current ratio 20%, delinquency behaviour 10%.
print('\nCOMPOSITE RISK SCORE');
riskDB.credit_profiles.aggregate([
  { $unwind: '$financial_statements' },
  { $sort: { borrower_id: 1, 'financial_statements.fiscal_year': -1, 'financial_statements.fiscal_quarter': -1 } },
  {
    $group: {
      _id: '$borrower_id',
      legal_name: { $first: '$legal_name' },
      bureau_score: { $first: '$credit_bureau_payload.score' },
      delinquencies: { $first: '$credit_bureau_payload.delinquencies_24m' },
      latest_noi: { $first: '$financial_statements.net_operating_income' },
      latest_debt_service: { $first: '$financial_statements.total_debt_service' },
      latest_assets: { $first: '$financial_statements.total_assets' },
      latest_liabilities: { $first: '$financial_statements.short_term_liabilities' }
    }
  },
  {
    $addFields: {
      dscr: { $cond: [{ $eq: ['$latest_debt_service', NumberDecimal('0.00')] }, 2.5, { $divide: ['$latest_noi', '$latest_debt_service'] }] },
      current_ratio: { $cond: [{ $eq: ['$latest_liabilities', NumberDecimal('0.00')] }, 3.0, { $divide: ['$latest_assets', '$latest_liabilities'] }] }
    }
  },
  {
    $addFields: {
      calculated_risk_score: {
        $round: [
          {
            $add: [
              { $multiply: [{ $min: [1, { $divide: ['$bureau_score', 850] }] }, 30] },
              { $multiply: [{ $min: [1, { $divide: ['$dscr', 2.0] }] }, 40] },
              { $multiply: [{ $min: [1, { $divide: ['$current_ratio', 2.0] }] }, 20] },
              { $multiply: [{ $max: [0, { $subtract: [1, { $multiply: ['$delinquencies', 0.25] }] }] }, 10] }
            ]
          },
          2
        ]
      }
    }
  },
  {
    $project: {
      legal_name: 1,
      bureau_score: 1,
      dscr: { $round: ['$dscr', 2] },
      current_ratio: { $round: ['$current_ratio', 2] },
      delinquencies: 1,
      calculated_risk_score: 1,
      risk_tier: {
        $switch: {
          branches: [
            { case: { $gte: ['$calculated_risk_score', 80] }, then: 'LOW' },
            { case: { $gte: ['$calculated_risk_score', 65] }, then: 'MODERATE' },
            { case: { $gte: ['$calculated_risk_score', 50] }, then: 'HIGH' }
          ],
          default: 'VERY_HIGH'
        }
      }
    }
  }
]).forEach(doc => printjson(doc));

print('\nCREDIT PROFILES');
riskDB.credit_profiles.find({}, {
  borrower_id: 1,
  legal_name: 1,
  entity_type: 1,
  underwriting_status: 1,
  'credit_bureau_payload.score': 1
}).forEach(doc => printjson(doc));
