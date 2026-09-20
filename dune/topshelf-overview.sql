-- TopShelf protocol overview on Robinhood Chain
-- Contract: 0xc1DB49694E0DB50778c333350C8A553fDE221989
WITH registrations AS (
  SELECT
    evt_block_time AS block_time,
    varbinary_substring(topic2, 13, 20) AS player,
    varbinary_to_uint256(topic3) AS season,
    varbinary_substring(data, 1, 20) AS token,
    varbinary_to_uint256(varbinary_substring(data, 33, 32)) AS score,
    varbinary_to_uint256(varbinary_substring(data, 65, 32)) AS amount
  FROM robinhood.logs
  WHERE contract_address = 0xc1DB49694E0DB50778c333350C8A553fDE221989
    AND topic0 = keccak(to_utf8('ScoreRegistered(bytes32,address,uint256,address,uint64,uint256,bytes32)'))
)
SELECT
  count(*) AS verified_registrations,
  approx_distinct(player) AS unique_players,
  max(score) AS all_time_high_score,
  max(season) AS latest_season,
  max(block_time) AS latest_registration
FROM registrations
