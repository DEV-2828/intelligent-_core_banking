import { BSON } from "mongodb";
export const profileOptions = {
  "validator": {
    "$jsonSchema": {
      "bsonType": "object",
      "required": [
        "borrower_id",
        "entity_type",
        "legal_name",
        "tax_identifier",
        "credit_bureau_payload",
        "financial_statements",
        "underwriting_status",
        "updated_at"
      ],
      "properties": {
        "borrower_id": {
          "bsonType": "string"
        },
        "entity_type": {
          "enum": [
            "RETAIL",
            "SME",
            "CORPORATE"
          ]
        },
        "legal_name": {
          "bsonType": "string"
        },
        "tax_identifier": {
          "bsonType": "string"
        },
        "underwriting_status": {
          "enum": [
            "PENDING",
            "UNDER_REVIEW",
            "APPROVED",
            "REJECTED"
          ]
        },
        "approved_loan_id": {
          "bsonType": [
            "string",
            "null"
          ]
        },
        "credit_bureau_payload": {
          "bsonType": "object",
          "required": [
            "bureau_name",
            "score",
            "delinquencies_24m"
          ],
          "properties": {
            "bureau_name": {
              "bsonType": "string"
            },
            "score": {
              "bsonType": "int",
              "minimum": 300,
              "maximum": 900
            },
            "delinquencies_24m": {
              "bsonType": "int",
              "minimum": 0
            }
          }
        },
        "financial_statements": {
          "bsonType": "array",
          "minItems": 1,
          "items": {
            "bsonType": "object",
            "required": [
              "fiscal_year",
              "fiscal_quarter",
              "revenue",
              "operating_expenses",
              "net_operating_income",
              "operating_cash_flow",
              "total_debt_service",
              "short_term_liabilities",
              "total_assets",
              "current_assets"
            ],
            "properties": {
              "fiscal_year": {
                "bsonType": "int"
              },
              "fiscal_quarter": {
                "bsonType": "int",
                "minimum": 1,
                "maximum": 4
              },
              "revenue": {
                "bsonType": "decimal"
              },
              "operating_expenses": {
                "bsonType": "decimal"
              },
              "net_operating_income": {
                "bsonType": "decimal"
              },
              "operating_cash_flow": {
                "bsonType": "decimal"
              },
              "total_debt_service": {
                "bsonType": "decimal"
              },
              "short_term_liabilities": {
                "bsonType": "decimal"
              },
              "total_assets": {
                "bsonType": "decimal"
              },
              "current_assets": {
                "bsonType": "decimal"
              }
            }
          }
        },
        "updated_at": {
          "bsonType": "date"
        }
      }
    }
  },
  "validationLevel": "strict",
  "validationAction": "error"
};
export const profileIndexes = [
  [
    {
      "borrower_id": 1
    },
    {
      "unique": true
    }
  ],
  [
    {
      "tax_identifier": 1
    },
    {
      "unique": true
    }
  ],
  [
    {
      "entity_type": 1,
      "underwriting_status": 1
    },
    {}
  ],
  [
    {
      "credit_bureau_payload.score": -1
    },
    {}
  ]
];
export const demoProfiles = BSON.EJSON.parse("[{\"_id\":{\"$oid\":\"66ff00000000000000000001\"},\"borrower_id\":\"11111111-1111-4111-8111-111111111111\",\"entity_type\":\"SME\",\"legal_name\":\"Arjun Trading Enterprises\",\"tax_identifier\":\"GSTIN-DEMO-ARJUN-01\",\"underwriting_status\":\"APPROVED\",\"approved_loan_id\":\"cccccccc-cccc-4ccc-8ccc-ccccccccccc1\",\"credit_bureau_payload\":{\"bureau_name\":\"DemoBureau\",\"score\":782,\"delinquencies_24m\":0},\"financial_statements\":[{\"fiscal_year\":2025,\"fiscal_quarter\":4,\"revenue\":{\"$numberDecimal\":\"2600000.00\"},\"operating_expenses\":{\"$numberDecimal\":\"1900000.00\"},\"net_operating_income\":{\"$numberDecimal\":\"700000.00\"},\"operating_cash_flow\":{\"$numberDecimal\":\"620000.00\"},\"total_debt_service\":{\"$numberDecimal\":\"280000.00\"},\"short_term_liabilities\":{\"$numberDecimal\":\"900000.00\"},\"total_assets\":{\"$numberDecimal\":\"2600000.00\"},\"current_assets\":{\"$numberDecimal\":\"1950000.00\"}},{\"fiscal_year\":2026,\"fiscal_quarter\":1,\"revenue\":{\"$numberDecimal\":\"2750000.00\"},\"operating_expenses\":{\"$numberDecimal\":\"1980000.00\"},\"net_operating_income\":{\"$numberDecimal\":\"770000.00\"},\"operating_cash_flow\":{\"$numberDecimal\":\"690000.00\"},\"total_debt_service\":{\"$numberDecimal\":\"290000.00\"},\"short_term_liabilities\":{\"$numberDecimal\":\"920000.00\"},\"total_assets\":{\"$numberDecimal\":\"2750000.00\"},\"current_assets\":{\"$numberDecimal\":\"2062500.00\"}},{\"fiscal_year\":2026,\"fiscal_quarter\":2,\"revenue\":{\"$numberDecimal\":\"2900000.00\"},\"operating_expenses\":{\"$numberDecimal\":\"2050000.00\"},\"net_operating_income\":{\"$numberDecimal\":\"850000.00\"},\"operating_cash_flow\":{\"$numberDecimal\":\"760000.00\"},\"total_debt_service\":{\"$numberDecimal\":\"300000.00\"},\"short_term_liabilities\":{\"$numberDecimal\":\"950000.00\"},\"total_assets\":{\"$numberDecimal\":\"2900000.00\"},\"current_assets\":{\"$numberDecimal\":\"2175000.00\"}},{\"fiscal_year\":2026,\"fiscal_quarter\":3,\"revenue\":{\"$numberDecimal\":\"3050000.00\"},\"operating_expenses\":{\"$numberDecimal\":\"2140000.00\"},\"net_operating_income\":{\"$numberDecimal\":\"910000.00\"},\"operating_cash_flow\":{\"$numberDecimal\":\"805000.00\"},\"total_debt_service\":{\"$numberDecimal\":\"310000.00\"},\"short_term_liabilities\":{\"$numberDecimal\":\"970000.00\"},\"total_assets\":{\"$numberDecimal\":\"3100000.00\"},\"current_assets\":{\"$numberDecimal\":\"2325000.00\"}}],\"updated_at\":{\"$date\":\"2026-11-10T12:28:49.654Z\"}},{\"_id\":{\"$oid\":\"66ff00000000000000000002\"},\"borrower_id\":\"22222222-2222-4222-8222-222222222222\",\"entity_type\":\"SME\",\"legal_name\":\"Neha Manufacturing Works\",\"tax_identifier\":\"GSTIN-DEMO-NEHA-02\",\"underwriting_status\":\"UNDER_REVIEW\",\"approved_loan_id\":null,\"credit_bureau_payload\":{\"bureau_name\":\"DemoBureau\",\"score\":716,\"delinquencies_24m\":1},\"financial_statements\":[{\"fiscal_year\":2025,\"fiscal_quarter\":4,\"revenue\":{\"$numberDecimal\":\"1800000.00\"},\"operating_expenses\":{\"$numberDecimal\":\"1450000.00\"},\"net_operating_income\":{\"$numberDecimal\":\"350000.00\"},\"operating_cash_flow\":{\"$numberDecimal\":\"300000.00\"},\"total_debt_service\":{\"$numberDecimal\":\"250000.00\"},\"short_term_liabilities\":{\"$numberDecimal\":\"780000.00\"},\"total_assets\":{\"$numberDecimal\":\"1500000.00\"},\"current_assets\":{\"$numberDecimal\":\"1125000.00\"}},{\"fiscal_year\":2026,\"fiscal_quarter\":1,\"revenue\":{\"$numberDecimal\":\"1850000.00\"},\"operating_expenses\":{\"$numberDecimal\":\"1490000.00\"},\"net_operating_income\":{\"$numberDecimal\":\"360000.00\"},\"operating_cash_flow\":{\"$numberDecimal\":\"310000.00\"},\"total_debt_service\":{\"$numberDecimal\":\"255000.00\"},\"short_term_liabilities\":{\"$numberDecimal\":\"790000.00\"},\"total_assets\":{\"$numberDecimal\":\"1540000.00\"},\"current_assets\":{\"$numberDecimal\":\"1155000.00\"}},{\"fiscal_year\":2026,\"fiscal_quarter\":2,\"revenue\":{\"$numberDecimal\":\"1920000.00\"},\"operating_expenses\":{\"$numberDecimal\":\"1530000.00\"},\"net_operating_income\":{\"$numberDecimal\":\"390000.00\"},\"operating_cash_flow\":{\"$numberDecimal\":\"330000.00\"},\"total_debt_service\":{\"$numberDecimal\":\"260000.00\"},\"short_term_liabilities\":{\"$numberDecimal\":\"810000.00\"},\"total_assets\":{\"$numberDecimal\":\"1600000.00\"},\"current_assets\":{\"$numberDecimal\":\"1200000.00\"}},{\"fiscal_year\":2026,\"fiscal_quarter\":3,\"revenue\":{\"$numberDecimal\":\"2000000.00\"},\"operating_expenses\":{\"$numberDecimal\":\"1580000.00\"},\"net_operating_income\":{\"$numberDecimal\":\"420000.00\"},\"operating_cash_flow\":{\"$numberDecimal\":\"350000.00\"},\"total_debt_service\":{\"$numberDecimal\":\"265000.00\"},\"short_term_liabilities\":{\"$numberDecimal\":\"830000.00\"},\"total_assets\":{\"$numberDecimal\":\"1680000.00\"},\"current_assets\":{\"$numberDecimal\":\"1260000.00\"}}],\"updated_at\":{\"$date\":\"2026-11-10T12:28:49.655Z\"}}]", {relaxed:false});
