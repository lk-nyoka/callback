declare module "word-extractor" {
  interface ExtractedDoc {
    getBody(): string;
    getHeaders?(opts?: { includeFooters?: boolean }): string;
  }
  export default class WordExtractor {
    extract(input: string | Buffer): Promise<ExtractedDoc>;
  }
}
