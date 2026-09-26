/**
 * @fileoverview Public API of the utils module.
 */

export {
  center,
  parseArgv,
  quote,
  repeatChar,
  truncate,
  type ParsedArgv,
} from './text.js';
export {computeTextStats} from './text-stats.js';
export {
  DEFAULT_REGEX_MAX_LENGTH,
  SUPPORTED_FLAGS,
  applyRegex,
  type RegexOptions,
} from './regex.js';
export {exampleFromSchema, formatToolSpec} from './tool-spec.js';
export {
  DEFAULT_INDENT,
  formatJson,
  MAX_INDENT,
  type JsonFormatResult,
} from './json.js';
export {parsePath, queryJson} from './json-query.js';
export {DEFAULT_PATH_PLATFORM, parsePathParts, pathApi} from './path.js';
export {
  bumpVersion,
  compareVersions,
  parseRange,
  parseVersion,
  satisfiesRange,
  type SemverRelease,
} from './semver.js';
export {
  DEFAULT_DELIMITER,
  DEFAULT_EOL,
  TAB_DELIMITER,
  parseCsv,
  stringifyCsv,
} from './csv.js';
export {
  DEFAULT_TIME_FORMAT,
  DEFAULT_TIME_LOCALE,
  addTime,
  describeTime,
  diffTime,
  formatTime,
  parseDuration,
  parseTime,
} from './time.js';
export {
  DEFAULT_FILE_MAX_LENGTH,
  codecFile,
  hashFile,
  readFileBytes,
  resolveFilePath,
} from './file.js';
export {
  CRYPTO_HASH_ALGORITHMS,
  cryptoHash,
  HASH_ALGORITHMS,
  hashText,
  isHashAlgorithm,
  PROTON_HASH_ALGORITHMS,
  PROTON_HASH_SEED,
  protonHash,
  protonHash64,
} from './hash.js';
export {base64Decode, base64Encode} from './base64.js';
export {
  binaryDecode,
  binaryEncode,
  hexDecode,
  hexEncode,
} from './hex-binary.js';
export {htmlDecode, htmlEncode, urlDecode, urlEncode} from './url-html.js';
export {
  MORSE_WORD_SEPARATOR,
  morseDecode,
  morseEncode,
  rot13,
} from './rot13-morse.js';
export {decodeJwt} from './jwt.js';
export {generateUuid, MAX_UUID, NIL_UUID, validateUuid} from './uuid.js';
export {
  DEFAULT_CACHE_TTL_MS,
  DEFAULT_TIMEOUT_MS,
  USER_AGENT,
  assertPublicUrl,
  cacheGet,
  cacheSet,
  canonicalUrl,
  cleanSpaces,
  decodeEntities,
  extractTitle,
  htmlToText,
  httpGet,
} from './web-core.js';
export {
  DEFAULT_MAX_LENGTH,
  DEFAULT_MAX_PDF_BYTES,
  crawlSitemap,
  extractPdfText,
  fetchDocument,
  fetchPage,
} from './web-fetch.js';
export {
  htmlToMarkdown,
  readHtmlAttribute,
  type HtmlToMarkdownOptions,
} from './html-to-markdown.js';
export {
  DEFAULT_CRAWL_DEPTH,
  DEFAULT_CRAWL_MAX_LENGTH,
  DEFAULT_MAX_PAGES,
  MAX_CRAWL_DEPTH,
  MAX_CRAWL_PAGES,
  crawlDocumentation,
  extractLinks,
} from './web-crawl.js';
export {
  DEFAULT_REQUEST_MAX_LENGTH,
  REQUEST_METHODS,
  requestUrl,
} from './web-request.js';
export {
  FRESHNESS_MAP,
  MAX_CONCURRENT_RENDERS,
  duckDuckGoSearch,
  findBrowser,
  googleSearch,
  googleSearchApi,
  googleSuggest,
  isBrowserAvailable,
  resolveGotoToken,
  runEngine,
} from './web-engines.js';
export {
  DEFAULT_ENGINE,
  DEFAULT_ENGINES,
  DEFAULT_LIMIT,
  annotateDuplicates,
  isFreshnessWindow,
  isSearchEngine,
  isSearchTab,
  labelQuality,
  listResearch,
  multiSourceSearch,
  rankResults,
  researchFile,
  saveResearch,
  search,
  searchBatch,
  summarize,
  verifyFreshness,
  verifySources,
} from './web-search.js';
