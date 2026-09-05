# Regression tests

Run `npm test` with Node.js 18 or later. No installation or network connection is needed.

The test harness creates solve and solvedup links by calling Penpa+'s own export
methods, converts them, then passes the reconstructed layer through Penpa+'s
`make_solution()` checker. An identical checker result demonstrates that the
information present in the answer-check payload survived reconstruction.
For multiple OR alternatives, the chosen branch is compared independently.

`reference/penpa-reference.js` contains selected, unmodified upstream methods
from Penpa+ 3.2.4, commit
`34e3fe97804e518288870b70d919e7e76ee18b4d`. The original source URL and MIT
license are included alongside them. The harness supplies minimal checkbox,
metadata, and compression adapters instead of requiring a browser. It does not
use the converter's own serialization or reconstruction code as the oracle.

The suite covers checked numbers and text, all supported checker symbols,
shading including exact multicolor cells, line and edge styles, walls, OR
alternatives, tight-fit corner numbers, edge-suffixed identifiers, solvedup
normalization, immutable givens and board data, escaping, invalid input, and
explicit warnings for information absent from the source payload.

`network.test.cjs` uses mocked responses and simulated timers to verify TinyURL
resolution, exact host matching, service failures, and timeouts. It also proves
that optional logging can fail or remain pending without delaying conversion.
These tests do not contact any external service or wait for real service timeouts.

The grid-name tests verify preservation of the serialized geometry fields and
point identifiers; they do not render every grid. The checker roundtrips also
do not prove recovery of artistic details or drawing objects that Penpa never
stored in its answer payload. Browser rendering checks remain separate.
