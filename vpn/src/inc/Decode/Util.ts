export class Util {

    public static int8_to_hex: string[] = [];
    public static int8_to_hex_nopad: string[] = [];
    public static int8_to_dec: string[] = [];

    public static lpad(str: string, len: number): string {
        let nstr = str;

        while (nstr.length < len) {
            nstr = `0${str}`;
        }

        return nstr;
    }

    public static init(): void {
        if (Util.int8_to_hex.length !== 0) {
            return;
        }

        for (let i = 0; i <= 255; i++) {
            Util.int8_to_hex[i] = Util.lpad(i.toString(16), 2);
            Util.int8_to_hex_nopad[i] = i.toString(16);
            Util.int8_to_dec[i] = i.toString();
        }
    }

}

/**
 * init
 */
Util.init();