/**
 * LangDefine
 */
export interface LangDefine {

    /**
     * getClassName
     */
    getClassName: () => string;

    /**
     * l
     * @param content
     */
    l: (content: string) => string | null;
}