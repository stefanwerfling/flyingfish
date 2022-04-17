/**
 * NetFetch
 */
export class NetFetch {

    /**
     * postData
     * @param url
     * @param data
     */
    public static async postData(url = '', data = {}): Promise<any> {
        // Default options are marked with *
        const response = await fetch(url, {
            method: 'POST',
            mode: 'cors',
            cache: 'no-cache',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json'
            },
            redirect: 'follow',
            referrerPolicy: 'no-referrer',
            body: JSON.stringify(data)
        });

        return response.json();
    }

    /**
     * getData
     * @param url
     */
    public static async getData(url = ''): Promise<any> {
        const response = await fetch(url, {
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json'
            },
            redirect: 'follow',
            referrerPolicy: 'no-referrer'
        });

        return response.json();
    }

}