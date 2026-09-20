-- Score-registration payments grouped by Robinhood token contract
WITH registrations AS (
  SELECT
    evt_block_time AS block_time,
    varbinary_substring(data, 1, 20) AS token,
    varbinary_to_uint256(varbinary_substring(data, 65, 32)) AS raw_amount
  FROM robinhood.logs
  WHERE contract_address = 0xc1DB49694E0DB50778c333350C8A553fDE221989
    AND topic0 = keccak(to_utf8('ScoreRegistered(bytes32,address,uint256,address,uint64,uint256,bytes32)'))
)
SELECT
  r.token,
  coalesce(t.symbol, concat('0x', to_hex(r.token))) AS symbol,
  count(*) AS payments,
  sum(r.raw_amount / power(10, coalesce(t.decimals, 18))) AS token_amount,
  min(r.block_time) AS first_payment,
  max(r.block_time) AS latest_payment
FROM registrations r
LEFT JOIN tokens.erc20 t
  ON t.blockchain = 'robinhood' AND t.contract_address = r.token
GROUP BY 1, 2
ORDER BY payments DESC, symbol
