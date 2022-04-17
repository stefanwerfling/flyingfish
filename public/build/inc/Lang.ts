import {LangDefine} from './Lang/LangDefine';
import {Lang_EN} from '../langs/Lang_EN';

/**
 * Lang
 */
export class Lang {

    private static _store: {[index: string]: LangDefine;} = {};
    private static _instance: Lang | null = null;

    private _defaultLang: LangDefine;
    private _lang: LangDefine;

    /**
     * init
     */
    public static init(): void {
        Lang.addStore(new Lang_EN());
    }

    /**
     * addStore
     * @param alang
     */
    public static addStore(alang: LangDefine): void {
        Lang._store[alang.getClassName()] = alang;
    }

    /**
     * i
     * @param langPack
     */
    public static i(langPack: string | null = null): Lang {
        if (Lang._instance) {
            return Lang._instance;
        }

        let lp = langPack;

        if (!lp) {
            lp = 'Lang_EN';
        }

        Lang._instance = new Lang(lp);

        return Lang._instance;
    }

    /**
     * constructor
     * @param langPack
     * @param defaultLangPack
     */
    public constructor(langPack: string, defaultLangPack = 'Lang_EN') {
        this._defaultLang = Lang._store[defaultLangPack];
        this._lang = Lang._store[langPack];
    }

    /**
     * l
     * @param content
     */
    public l(content: string): string {
        let rcontent: string | null = null;

        if (this._lang) {
            rcontent = this._lang.l(content);
        }

        if (!rcontent) {
            rcontent = this._defaultLang.l(content);
        }

        if (rcontent) {
            return rcontent;
        }

        return content;
    }

}

// init
Lang.init();