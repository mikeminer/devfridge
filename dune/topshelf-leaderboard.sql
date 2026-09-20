-- One row per player and season, using each player's best verified score
WITH registrations AS (
  SELECT
    evt_block_time AS block_time,
    varbinary_substring(topic2, 13, 20) AS player,
    varbinary_to_uint256(topic3) AS season,
    varbinary_to_uint256(varbinary_substring(data, 33, 32)) AS score
  FROM robinhood.logs
  WHERE contract_address = 0xc1DB49694E0DB50778c333350C8A553fDE221989
    AND topic0 = keccak(to_utf8('ScoreRegistered(bytes32,address,uint256,address,uint64,uint256,bytes32)'))
)
SELECT
  season,
  row_number() OVER (PARTITION BY season ORDER BY max(score) DESC, player) AS rank,
  player,
  max(score) AS best_score,
  count(*) AS registered_runs,
  max(block_time) AS last_registered
FROM registrations
GROUP BY 1, player
ORDER BY season DESC, rank
