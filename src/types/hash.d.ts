/**
 * @fileoverview Types for hashing tools.
 */

/** Cryptographic hash algorithms backed by `node:crypto`. */
export type CryptoHashAlgorithm = 'md5' | 'sha1' | 'sha256' | 'sha512';

/** The ProtonHash algorithm from the Proton SDK by Seth Robinson. */
export type ProtonHashAlgorithm = 'protonhash' | 'protonhash64';

/** Any algorithm supported by the `hash` tool. */
export type HashAlgorithm = CryptoHashAlgorithm | ProtonHashAlgorithm;
