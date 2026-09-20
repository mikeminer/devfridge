-- TopShelf daily verified score activity
WITH registrations AS (
  SELECT
    block_time,
    varbinary_substring(topic2, 13, 20) AS player,
    varbinary_to_uint256(topic3) AS season,
    varbinary_to_uint256(varbinary_substring(data, 33, 32)) AS score
  FROM robinhood.logs
  WHERE block_number >= 59400000
    AND contract_address = 0xc1DB49694E0DB50778c333350C8A553fDE221989
    AND topic0 = keccak(to_utf8('ScoreRegistered(bytes32,address,uint256,address,uint64,uint256,bytes32)'))
)
SELECT
  date_trunc('day', block_time) AS day,
  count(*) AS registrations,
  approx_distinct(player) AS unique_players,
  max(score) AS best_score,
  avg(score) AS average_score
FROM registrations
GROUP BY 1
ORDER BY 1
