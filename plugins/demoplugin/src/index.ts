import {AFlyingFishPlugin, PluginServiceNames, PluginUiField, PluginUiFieldType} from 'flyingfish_core';
import {LoadDb} from './LoadDb.js';

/**
 * DemoPlugin
 *
 * Demonstrates the plugin config-UI (9.9.x): extends AFlyingFishPlugin and
 * declares a UI via getUiSchema(), so FlyingFish renders a config form for it
 * (Plugins page → Configure) and persists the values in `plugin_config` with no
 * extra plumbing.
 */
export default class DemoPlugin extends AFlyingFishPlugin {

    /**
     * getName
     */
    public getName(): string {
        return 'DemoPlugin';
    }

    /**
     * Declarative config UI — one field per supported type as a showcase.
     * @returns {PluginUiField[]}
     */
    public getUiSchema(): PluginUiField[] {
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
                    {value: 'fast', label: 'Fast'},
                    {value: 'balanced', label: 'Balanced'},
                    {value: 'thorough', label: 'Thorough'}
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

    /**
     * onDisable
     */
    public async onDisable(): Promise<boolean> {
        return false;
    }

    /**
     * onEnable
     */
    public async onEnable(): Promise<boolean> {
        if (this.getPluginManager().getServiceName() === PluginServiceNames.backend) {
            // register Db table loads
            this.getPluginManager().registerEvents(new LoadDb(), this);
        }

        return false;
    }

}
