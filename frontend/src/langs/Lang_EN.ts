import {LangDefine} from '../inc/Lang/LangDefine.js';
import tranlationEn from './i18n/Lang_EN.json';

/**
 * Lang_EN
 */
export class Lang_EN implements LangDefine {

    private _content: {[index: string]: string;} = tranlationEn;

    /**
     * l
     * @param acontent
     */
    public l(acontent: string): string | null {
        if (this._content[acontent]) {
            return this._content[acontent];
        }

        return null;
    }

    /**
     * getClassName
     */
    public getClassName(): string {
        return 'Lang_EN';
    }

}