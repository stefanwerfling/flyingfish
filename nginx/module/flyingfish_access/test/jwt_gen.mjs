// Cross-implementation test-vector generator for ngx_ff_jwt (Phase F, F.3). Signs
// HS256 tokens with Node's crypto (an INDEPENDENT implementation) so the C verifier is
// checked against a real, external signer — not against itself.
//
// Emits one case per line: "<expectedResultCode>\t<leeway>\t<token>", where the code
// matches the ff_jwt_result_t enum (0 OK, 1 MALFORMED, 2 ALG_MISMATCH, 3 BAD_SIGNATURE,
// 4 EXPIRED, 5 NOT_YET_VALID). argv: <secret> <now>.
import crypto from 'node:crypto';

const SECRET = process.argv[2];
const NOW = parseInt(process.argv[3], 10);

const b64 = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');

function sign(header, payload, secret) {
    const data = `${b64(header)}.${b64(payload)}`;
    const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
    return `${data}.${sig}`;
}

const H = {alg: 'HS256', typ: 'JWT'};
const out = [];
const add = (code, token, leeway = 0) => out.push(`${code}\t${leeway}\t${token}`);

// 0 = OK
add(0, sign(H, {sub: 'a', exp: NOW + 3600, nbf: NOW - 100}, SECRET));
add(0, sign(H, {sub: 'a', exp: NOW + 3600}, SECRET));                 // no nbf
// 4 = EXPIRED
add(4, sign(H, {sub: 'a', exp: NOW - 10}, SECRET));
add(4, sign(H, {sub: 'a'}, SECRET));                                  // exp missing → deny
// 5 = NOT_YET_VALID
add(5, sign(H, {sub: 'a', exp: NOW + 3600, nbf: NOW + 100}, SECRET));
// 3 = BAD_SIGNATURE (signed with a different secret)
add(3, sign(H, {sub: 'a', exp: NOW + 3600}, 'the-wrong-secret'));
// 3 = BAD_SIGNATURE (valid sig over payload A, then payload swapped to B)
{
    const good = sign(H, {sub: 'a', exp: NOW + 3600}, SECRET);
    const [h, , s] = good.split('.');
    const tampered = `${h}.${b64({sub: 'attacker', exp: NOW + 3600})}.${s}`;
    add(3, tampered);
}
// 2 = ALG_MISMATCH (pinned HS256; token claims RS256 / none)
add(2, `${b64({alg: 'RS256', typ: 'JWT'})}.${b64({sub: 'a', exp: NOW + 3600})}.AAAA`);
add(2, `${b64({alg: 'none', typ: 'JWT'})}.${b64({sub: 'a', exp: NOW + 3600})}.AAAA`);
// 1 = MALFORMED
add(1, 'notajwt');
add(1, 'a.b.c.d');
// leeway: expired by 10s but 60s leeway → OK
add(0, sign(H, {sub: 'a', exp: NOW - 10}, SECRET), 60);
// leeway: not-yet-valid by 10s but 60s leeway → OK
add(0, sign(H, {sub: 'a', exp: NOW + 3600, nbf: NOW + 10}, SECRET), 60);

process.stdout.write(out.join('\n') + '\n');
