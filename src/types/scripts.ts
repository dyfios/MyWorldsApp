/**
 * Script payload attached to an entity variant.
 * Keys map to JavaScript source strings executed by ScriptEngine.
 */
export interface EntityScriptMap {
  on_create?: string;
  on_destroy?: string;
  on_pickup?: string;
  on_place?: string;
  on_touch?: string;
  on_untouch?: string;
  on_use?: string;
  '0_25_update'?: string;
  '0_5_update'?: string;
  '1_0_update'?: string;
  '2_0_update'?: string;
  [key: string]: string | undefined;
}
