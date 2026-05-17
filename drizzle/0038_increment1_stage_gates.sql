-- Increment 1: v3 Strategy Flow — Stage Gate State Machine (Stages 1-4)
ALTER TABLE `ail_org_context`
  ADD COLUMN `stage_gate_state_json` text COMMENT 'JSON: { stage1: { completedAt, lastEditedAt }, stage2: ..., stage3: ..., stage4: ... }',
  ADD COLUMN `vision_confirmed_at` timestamp COMMENT 'When CPO confirmed Stage 2 vision',
  ADD COLUMN `vision_inspiration_source` varchar(100) COMMENT '"own" | "peer_starter_${id}"',
  ADD COLUMN `strategy_archetype` varchar(50) COMMENT '"augmentation" | "transformation" | "differentiation" | "efficiency" | "defensive"',
  ADD COLUMN `strategy_statement` text COMMENT 'CPO strategy statement (40-80 words)',
  ADD COLUMN `strategy_confirmed_at` timestamp COMMENT 'When CPO confirmed Stage 3 strategy',
  ADD COLUMN `stage4_confirmed_at` timestamp COMMENT 'When CPO confirmed Stage 4 principles + won''t-do';
