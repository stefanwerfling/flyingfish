import { AFlyingFishPlugin, PluginServiceNames, PluginUiFieldType } from 'flyingfish_core';
import { LoadDb } from './LoadDb.js';
export default class DemoPlugin extends AFlyingFishPlugin {
    getName() {
        return 'DemoPlugin';
    }
    getUiSchema() {
        return [
            {
                key: 'api_url',
                type: PluginUiFieldType.string,
                label: 'API URL',
                description: 'Base URL of the demo service.',
                placeholder: 'https://example.com',
                required: true,
                default: 'https://example.com'
            },
            {
                key: 'api_key',
                type: PluginUiFieldType.password,
                label: 'API key',
                description: 'Secret token used to authenticate against the demo service.'
            },
            {
                key: 'max_items',
                type: PluginUiFieldType.number,
                label: 'Max items',
                description: 'How many items to fetch per run.',
                default: 25
            },
            {
                key: 'sync_enabled',
                type: PluginUiFieldType.bool,
                label: 'Enable periodic sync',
                description: 'Sync items on a schedule.',
                default: true
            },
            {
                key: 'mode',
                type: PluginUiFieldType.enum,
                label: 'Mode',
                description: 'Operating mode of the demo service.',
                default: 'balanced',
                options: [
                    { value: 'fast', label: 'Fast' },
                    { value: 'balanced', label: 'Balanced' },
                    { value: 'thorough', label: 'Thorough' }
                ]
            },
            {
                key: 'notes',
                type: PluginUiFieldType.textarea,
                label: 'Notes',
                description: 'Free-form notes stored with the plugin config.',
                placeholder: 'Anything to remember...'
            }
        ];
    }
    async onDisable() {
        return false;
    }
    async onEnable() {
        if (this.getPluginManager().getServiceName() === PluginServiceNames.backend) {
            this.getPluginManager().registerEvents(new LoadDb(), this);
        }
        return false;
    }
}
//# sourceMappingURL=index.js.map