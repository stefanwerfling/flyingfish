import {PluginUiField, PluginUiFieldType} from '@stefanwerfling/figtree';
import {ObjectSchemaItems, Schema, Vts} from 'vts';

/**
 * Compile a plugin's declarative config-UI field list into a VTS object schema
 * for validating the values a plugin receives in `setData`.
 *
 * This is the single source of truth: the same `PluginUiField[]` that the
 * frontend renders into a form is turned here into the validator the backend
 * enforces. The field `type` is a widget hint, so several types collapse onto
 * the same value validator (password/textarea/enum are all strings on the wire).
 * Non-required fields become optional in the schema.
 * @param {PluginUiField[]} fields - Declarative field descriptions.
 * @returns {Schema<unknown>} VTS object schema over the field keys.
 */
export function fieldsToVts(fields: PluginUiField[]): Schema<unknown> {
    const shape: ObjectSchemaItems = {};

    for (const field of fields) {
        let base: Schema<unknown>;

        switch (field.type) {
            case PluginUiFieldType.number:
                base = Vts.number();
                break;

            case PluginUiFieldType.bool:
                base = Vts.boolean();
                break;

            case PluginUiFieldType.string:
            case PluginUiFieldType.password:
            case PluginUiFieldType.textarea:
            case PluginUiFieldType.enum:
            default:
                base = Vts.string();
                break;
        }

        shape[field.key] = field.required ? base : Vts.optional(base);
    }

    return Vts.object(shape);
}
