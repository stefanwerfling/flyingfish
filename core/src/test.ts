import {CertificateHelper, CertificateHelperKeyType} from './inc/Crypto/CertificateHelper.js';

const keys = await CertificateHelper.generateSshKeyPair(
    4096,
    CertificateHelperKeyType.rsa
);

console.log(keys.private);