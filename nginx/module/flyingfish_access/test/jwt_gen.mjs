// Cross-implementation test-vector generator for ngx_ff_jwt (Phase F, F.3+F.4). Signs
// HS256/RS256/ES256/EdDSA tokens with Node's crypto (an INDEPENDENT implementation) so
// the C verifier is checked against a real, external signer — not against itself.
//
// argv: <hmac-secret> <now> <keydir>. Writes the public keys (es1/es2/rs/ed .pem) and
// the kid-selection token files into <keydir>, and emits one line-loop case per line:
//   "<expectedResultCode>\t<configAlg>\t<leeway>\t<token>"
// where the code matches ff_jwt_result_t (0 OK, 1 MALFORMED, 2 ALG_MISMATCH,
// 3 BAD_SIGNATURE, 4 EXPIRED, 5 NOT_YET_VALID) and configAlg is what the verifier pins.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const SECRET = process.argv[2];
const NOW = parseInt(process.argv[3], 10);
const KEYDIR = process.argv[4];

const b64 = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');

// --- signers (each returns a compact JWT) ---
function signHS(header, payload, secret) {
    const d = `${b64(header)}.${b64(payload)}`;
    return `${d}.${crypto.createHmac('sha256', secret).update(d).digest('base64url')}`;
}
function signRS(header, payload, key) {
    const d = `${b64(header)}.${b64(payload)}`;
    const sig = crypto.createSign('SHA256').update(d).sign(key);
    return `${d}.${sig.toString('base64url')}`;
}
function signES(header, payload, key) {
    const d = `${b64(header)}.${b64(payload)}`;
    const sig = crypto.createSign('SHA256').update(d).sign({key, dsaEncoding: 'ieee-p1363'});
    return `${d}.${sig.toString('base64url')}`;
}
function signED(header, payload, key) {
    const d = `${b64(header)}.${b64(payload)}`;
    const sig = crypto.sign(null, Buffer.from(d), key);
    return `${d}.${sig.toString('base64url')}`;
}

// --- keypairs ---
const es1 = crypto.generateKeyPairSync('ec', {namedCurve: 'P-256'});
const es2 = crypto.generateKeyPairSync('ec', {namedCurve: 'P-256'});
const esX = crypto.generateKeyPairSync('ec', {namedCurve: 'P-256'});   // throwaway (wrong key)
const rs = crypto.generateKeyPairSync('rsa', {modulusLength: 2048});
const rs2 = crypto.generateKeyPairSync('rsa', {modulusLength: 2048});   // throwaway (wrong key)
const ed = crypto.generateKeyPairSync('ed25519');

const pem = (kp) => kp.publicKey.export({type: 'spki', format: 'pem'});
fs.writeFileSync(path.join(KEYDIR, 'es1.pem'), pem(es1));
fs.writeFileSync(path.join(KEYDIR, 'es2.pem'), pem(es2));
fs.writeFileSync(path.join(KEYDIR, 'rs.pem'), pem(rs));
fs.writeFileSync(path.join(KEYDIR, 'ed.pem'), pem(ed));

// kid-selection token files (verified in the C harness against a 2-key set):
fs.writeFileSync(path.join(KEYDIR, 'kid_ok.jwt'),      // kid k2 → must select es2
    signES({alg: 'ES256', typ: 'JWT', kid: 'k2'}, {sub: 'a', exp: NOW + 3600}, es2.privateKey));
fs.writeFileSync(path.join(KEYDIR, 'kid_unknown.jwt'), // kid kX, no such key → deny
    signES({alg: 'ES256', typ: 'JWT', kid: 'kX'}, {sub: 'a', exp: NOW + 3600}, es2.privateKey));
fs.writeFileSync(path.join(KEYDIR, 'kid_none.jwt'),    // no kid, 2 keys → ambiguous → deny
    signES({alg: 'ES256', typ: 'JWT'}, {sub: 'a', exp: NOW + 3600}, es2.privateKey));

// claim (iss/aud/require) token files — HS256, verified in the C claim sub-test:
const claimTok = (payload) => signHS({alg: 'HS256', typ: 'JWT'}, {exp: NOW + 3600, ...payload}, SECRET);
fs.writeFileSync(path.join(KEYDIR, 'c_iss_ok.jwt'),   claimTok({iss: 'https://ff'}));
fs.writeFileSync(path.join(KEYDIR, 'c_iss_bad.jwt'),  claimTok({iss: 'https://evil'}));
fs.writeFileSync(path.join(KEYDIR, 'c_iss_miss.jwt'), claimTok({sub: 'a'}));
fs.writeFileSync(path.join(KEYDIR, 'c_aud_str.jwt'),  claimTok({aud: 'myapi'}));
fs.writeFileSync(path.join(KEYDIR, 'c_aud_arr.jwt'),  claimTok({aud: ['a', 'myapi', 'b']}));
fs.writeFileSync(path.join(KEYDIR, 'c_aud_bad.jwt'),  claimTok({aud: ['x', 'y']}));
fs.writeFileSync(path.join(KEYDIR, 'c_scope_ok.jwt'), claimTok({scope: 'read write admin'}));
fs.writeFileSync(path.join(KEYDIR, 'c_scope_bad.jwt'), claimTok({scope: 'read write'}));
fs.writeFileSync(path.join(KEYDIR, 'c_roles_ok.jwt'), claimTok({roles: ['user', 'admin']}));

// --- line-loop cases ---
const H = (alg) => ({alg, typ: 'JWT'});
const out = [];
const add = (code, alg, token, leeway = 0) => out.push(`${code}\t${alg}\t${leeway}\t${token}`);

// HS256 (as F.3)
add(0, 'HS256', signHS(H('HS256'), {sub: 'a', exp: NOW + 3600, nbf: NOW - 100}, SECRET));
add(4, 'HS256', signHS(H('HS256'), {sub: 'a', exp: NOW - 10}, SECRET));
add(4, 'HS256', signHS(H('HS256'), {sub: 'a'}, SECRET));                  // exp missing
add(5, 'HS256', signHS(H('HS256'), {sub: 'a', exp: NOW + 3600, nbf: NOW + 100}, SECRET));
add(3, 'HS256', signHS(H('HS256'), {sub: 'a', exp: NOW + 3600}, 'wrong-secret'));
add(2, 'HS256', `${b64(H('RS256'))}.${b64({sub: 'a', exp: NOW + 3600})}.AAAA`);
add(2, 'HS256', `${b64(H('none'))}.${b64({sub: 'a', exp: NOW + 3600})}.AAAA`);
add(1, 'HS256', 'notajwt');
add(1, 'HS256', 'a.b.c.d');
add(0, 'HS256', signHS(H('HS256'), {sub: 'a', exp: NOW - 10}, SECRET), 60);   // leeway saves it

// RS256
add(0, 'RS256', signRS(H('RS256'), {sub: 'a', exp: NOW + 3600}, rs.privateKey));
add(4, 'RS256', signRS(H('RS256'), {sub: 'a', exp: NOW - 10}, rs.privateKey));
add(3, 'RS256', signRS(H('RS256'), {sub: 'a', exp: NOW + 3600}, rs2.privateKey));    // wrong key

// ES256
add(0, 'ES256', signES(H('ES256'), {sub: 'a', exp: NOW + 3600}, es1.privateKey));
add(3, 'ES256', signES(H('ES256'), {sub: 'a', exp: NOW + 3600}, esX.privateKey));   // wrong key
add(2, 'RS256', signES(H('ES256'), {sub: 'a', exp: NOW + 3600}, es1.privateKey));   // alg confusion

// EdDSA
add(0, 'EdDSA', signED(H('EdDSA'), {sub: 'a', exp: NOW + 3600}, ed.privateKey));
add(4, 'EdDSA', signED(H('EdDSA'), {sub: 'a', exp: NOW - 10}, ed.privateKey));       // claims run after verify

process.stdout.write(out.join('\n') + '\n');
