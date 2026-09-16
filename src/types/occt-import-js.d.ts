/**
 * occt-import-js ships no type declarations. This describes only the slice of
 * the API this app uses: reading a STEP file into triangulated meshes.
 */
declare module "occt-import-js" {
  export type OcctMeshAttribute = { readonly array: ArrayLike<number> };

  export type OcctMesh = {
    readonly name?: string;
    readonly color?: readonly [number, number, number];
    readonly attributes: {
      readonly position: OcctMeshAttribute;
      readonly normal?: OcctMeshAttribute;
    };
    readonly index?: OcctMeshAttribute;
  };

  export type OcctReadResult = {
    readonly success: boolean;
    readonly meshes: readonly OcctMesh[];
  };

  export type OcctReadParams = {
    /** Output unit. Passed explicitly so a model never arrives mis-scaled. */
    readonly linearUnit?:
      | "millimeter"
      | "centimeter"
      | "meter"
      | "inch"
      | "foot";
  };

  export type OcctModule = {
    ReadStepFile(
      buffer: Uint8Array,
      params: OcctReadParams | null,
    ): OcctReadResult;
    ReadIgesFile(
      buffer: Uint8Array,
      params: OcctReadParams | null,
    ): OcctReadResult;
    ReadBrepFile(
      buffer: Uint8Array,
      params: OcctReadParams | null,
    ): OcctReadResult;
  };

  export type OcctFactoryConfig = {
    /** Resolves the .wasm payload, which this app serves from /public/occt. */
    locateFile?: (path: string) => string;
  };

  export default function occtimportjs(
    config?: OcctFactoryConfig,
  ): Promise<OcctModule>;
}
