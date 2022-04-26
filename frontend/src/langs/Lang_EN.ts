import {LangDefine} from '../inc/Lang/LangDefine';

/**
 * Lang_EN
 */
export class Lang_EN implements LangDefine {

    private _content: {[index: string]: string;} = {
        title: 'FlyingFish',
        login_title: '<b>FlyingFish</b>'
    };

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