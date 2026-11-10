import type {Document,ObjectId} from "mongodb";
// Keep native NoSQL financial analytics visible and test their parity with the versioned scoring model.
export function financialPipeline(id:ObjectId):Document[]{return [
 {$match:{_id:id}},
 {$set:{profile:"$$ROOT",quarters:{$slice:[{$sortArray:{input:"$financial_statements",sortBy:{fiscal_year:-1,fiscal_quarter:-1}}},4]}}},
 {$set:{latest:{$arrayElemAt:["$quarters",0]},noi:{$sum:"$quarters.net_operating_income"},debt:{$sum:"$quarters.total_debt_service"},ocf:{$sum:"$quarters.operating_cash_flow"},revenue:{$sum:"$quarters.revenue"}}},
 {$project:{_id:0,profile:1,
 dscr:{$cond:[{$eq:["$debt",0]},null,{$round:[{$divide:["$noi","$debt"]},2]}]},
 ocfMargin:{$cond:[{$eq:["$revenue",0]},null,{$round:[{$multiply:[{$divide:["$ocf","$revenue"]},100]},2]}]},
 currentRatio:{$cond:[{$eq:["$latest.short_term_liabilities",0]},null,{$round:[{$divide:["$latest.current_assets","$latest.short_term_liabilities"]},2]}]}
 }}
];}
