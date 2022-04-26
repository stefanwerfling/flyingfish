/**
 * ContextNames
 */
export enum ContextNames {
    events = 'events',
    server = 'server',
    http = 'http',
    location = 'location',
    upstream = 'upstream',
    mail = 'mail',
    limit_except = 'limit_except',
    map = 'map',
    geo = 'geo',
    match = 'match',
    stream = 'stream'
}

/**
 * Context
 */
export class Context {

    /**
     * name of block
     * @protected
     */
    protected _name: string = '';

    /**
     * nginx block variables
     * @protected
     */
    protected _variables: Map<string, string|Context> = new Map<string, string|Context>();

    /**
     * constructor
     * @param name
     */
    public constructor(name: string) {
        this._name = name;
    }

    /**
     * getName
     */
    public getName(): string {
        return this._name;
    }

    /**
     * addVariable
     * @param key
     * @param value
     */
    public addVariable(key: string, value: string|Context): void {
        this._variables.set(key, value);
    }

    /**
     * _createContent
     * @param value
     * @param index
     * @protected
     */
    protected _createContent(value: string, index: number): string {
        return '\t'.repeat(index) + value;
    }

    /**
     * _generateStr
     * @param index
     * @protected
     */
    protected _generateStr(index: number = 0): string {
        let buffer = '';

        this._variables.forEach((value, key) => {
            if (typeof value === 'string') {
                buffer += this._createContent(`\t${key} ${value};\n`, index);
            } else if (value instanceof Context) {
                const nindex = index + 1;

                buffer += '\n';
                buffer += this._createContent(`\t${value.generate(nindex)}\n`, index);
            }
        });

        return buffer;
    }

    /**
     * contextsToStr
     * @param contexts
     * @param index
     */
    public static contextsToStr(contexts: Context[], index: number = 0): string {
        let buffer = '';

        if (contexts.length > 0) {
            buffer += '\n';

            contexts.forEach((value) => {
                buffer += '\n';
                buffer += value.generate(index);
                buffer += '\n';
            });

            buffer += '\n';
        }

        return buffer;
    }

    /**
     * generate
     * @param index
     */
    public generate(index: number = 0): string {
        let buffer = this._createContent(`${this._name} {\n`, index);

        buffer += this._generateStr(index);

        return buffer + this._createContent('}\n', index);
    }

}