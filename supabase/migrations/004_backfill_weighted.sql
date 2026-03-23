-- Backfill stat_total with weighted power and rarity with new thresholds.
-- Weighted power: Tier1 (IMPACT, INFLUENCE, VISION) x2 + Tier2 (CRAFT, RANGE) x1.5 + Tier3 (TENURE) x1
-- Max = 200 (was 120 with raw sum)
--
-- Run this ONCE after deploying the weighted scoring code changes.

UPDATE public.github_cards
SET
  stat_total = (
    (stat_impact + stat_influence + stat_vision) * 2
    + (stat_craft + stat_range) * 1.5
    + stat_tenure
  )::smallint,
  rarity = CASE
    WHEN (stat_impact + stat_influence + stat_vision) * 2
       + (stat_craft + stat_range) * 1.5
       + stat_tenure >= 155 THEN 'Legendary'
    WHEN (stat_impact + stat_influence + stat_vision) * 2
       + (stat_craft + stat_range) * 1.5
       + stat_tenure >= 125 THEN 'Epic'
    WHEN (stat_impact + stat_influence + stat_vision) * 2
       + (stat_craft + stat_range) * 1.5
       + stat_tenure >= 95  THEN 'Rare'
    WHEN (stat_impact + stat_influence + stat_vision) * 2
       + (stat_craft + stat_range) * 1.5
       + stat_tenure >= 65  THEN 'Uncommon'
    ELSE 'Common'
  END;

-- Also update rarity inside the character JSONB to match
UPDATE public.github_cards
SET character = jsonb_set(
  character,
  '{rarity}',
  to_jsonb(rarity)
);

-- Recalculate percentile ranks with the new weighted totals
SELECT public.recalc_percentiles();
