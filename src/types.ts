/**
 * Interface representing final output word data
 */
export interface Word {
  number: string;
  name: string;
  alias?: [string, ...string[]];
  definitions: {
    text: string;
    reference?: string | undefined;
  }[];
  confer?: [string, ...string[]];
  example?: string | undefined;
  note?: string | undefined;
}
