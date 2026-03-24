-- Backfill stat_range with reach/magnitude bonus for existing cards.
--
-- The RANGE formula now adds a "reachBonus" based on totalStars from github_data:
--   totalStars > 100,000 => +5
--   totalStars > 10,000  => +3
--   totalStars > 1,000   => +1
--
-- This fixes outlier profiles (e.g. torvalds) that have massive impact
-- but few languages/repos, which previously scored very low on RANGE.
--
-- After updating stat_range, we recalculate stat_total (weighted power)
-- and rarity, then run recalc_percentiles().

-- Step 1: Recalculate stat_range with reach bonus
UPDATE public.github_cards
SET stat_range = LEAST(20, GREATEST(1,
  stat_range + CASE
    WHEN (github_data->>'totalStars')::int > 100000 THEN 5
    WHEN (github_data->>'totalStars')::int > 10000  THEN 3
    WHEN (github_data->>'totalStars')::int > 1000   THEN 1
    ELSE 0
  END
))
WHERE github_data IS NOT NULL
  AND github_data->>'totalStars' IS NOT NULL;

-- Step 2: Recalculate stat_total (weighted power) with new stat_range
UPDATE public.github_cards
SET stat_total = (
  (stat_impact + stat_influence + stat_vision) * 2
  + (stat_craft + stat_range) * 1.5
  + stat_tenure
)::smallint;

-- Step 3: Recalculate rarity based on new stat_total
UPDATE public.github_cards
SET rarity = CASE
  WHEN stat_total >= 155 THEN 'Legendary'
  WHEN stat_total >= 125 THEN 'Epic'
  WHEN stat_total >= 95  THEN 'Rare'
  WHEN stat_total >= 65  THEN 'Uncommon'
  ELSE 'Common'
END;

-- Step 4: Sync rarity inside the character JSONB
UPDATE public.github_cards
SET character = jsonb_set(
  character,
  '{rarity}',
  to_jsonb(rarity)
);

-- Step 5: Sync stat_range inside the character JSONB stats
UPDATE public.github_cards
SET character = jsonb_set(
  character,
  '{stats,RANGE}',
  to_jsonb(stat_range)
)
WHERE character->'stats' IS NOT NULL;

-- Step 6: Sync _weightedPower inside the character JSONB
UPDATE public.github_cards
SET character = jsonb_set(
  character,
  '{_weightedPower}',
  to_jsonb(stat_total)
)
WHERE character ? '_weightedPower';

-- Step 7: Recalculate percentile ranks
SELECT public.recalc_percentiles();
