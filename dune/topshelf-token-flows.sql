-- Score-registration payments grouped by Robinhood token contract
WITH registrations AS (
  SELECT
    block_time,
    varbinary_substring(data, 13, 20) AS token,
    varbinary_to_uint256(varbinary_substring(data, 65, 32)) AS raw_amount
  FROM robinhood.logs
  WHERE block_number >= 59400000
    AND contract_address = 0xc1DB49694E0DB50778c333350C8A553fDE221989
    AND topic0 = keccak(to_utf8('ScoreRegistered(bytes32,address,uint256,address,uint64,uint256,bytes32)'))
), labeled AS (
  SELECT *, CASE token
    WHEN 0x5c845330b41D9Bef68B46DC254353A770f44dee8 THEN 'TMC'
    WHEN 0x12B8Cba33606a4F7B85ee30620784c5a1015E816 THEN 'RUGARUGO'
    WHEN 0x6AF70B8487CD47dEf373c4A9eB58F990A3eDba37 THEN 'APE'
    WHEN 0x2AAa6d9e59734bb37EBc123Fe5dF797853F43AaC THEN 'FIFO'
    WHEN 0xF7aca11cDB86115eEDce7da43C5326A12408201e THEN 'FUSILLI'
    WHEN 0x8CfF8a877Ec7f5A63840143e9a1AF2c024A7e87E THEN 'LAMBOCELLO'
    WHEN 0x0713636AAe9DC16921F3f862fba52AF6DB5d1db3 THEN 'GMGN'
    WHEN 0x2A4e9362AB5fDcAb06A4A56B76dcBb286ea7D0FE THEN 'SESU'
    WHEN 0x29A13F8219d1D54424F1F9f1F90E85448488b2DE THEN 'MOONZARELLA'
    WHEN 0xC1c1ecB7596f8bc364E397Aaf987e4F11f88557c THEN 'BONKATINO'
    WHEN 0x575634d01aEeb4421c5EC4E06d861DFb0Da6df7a THEN 'CICCIA'
    WHEN 0x39dBED3a2bd333467115dE45665cC57F813C4571 THEN 'PONS'
    ELSE concat('0x', to_hex(token)) END AS symbol
  FROM registrations
)
SELECT
  token AS token_contract,
  symbol,
  count(*) AS payments,
  sum(raw_amount / 1e18) AS token_amount,
  min(block_time) AS first_payment,
  max(block_time) AS latest_payment
FROM labeled
GROUP BY 1, 2
ORDER BY payments DESC, symbol
