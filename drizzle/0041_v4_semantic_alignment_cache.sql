-- v4: Add LLM-semantic principle alignment cache columns to ail_org_context
ALTER TABLE `ail_org_context`
  ADD COLUMN `semantic_alignment_cache_key` varchar(64),
  ADD COLUMN `semantic_alignment_cache_json` text;
