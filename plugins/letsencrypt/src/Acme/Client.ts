export class Client {

    protected _endpoint: string = 'https://acme-v02.api.letsencrypt.org';

    protected _directory: any;

    public async init(): Promise<boolean> {
        this._directory = await (await fetch(`${this._endpoint}/directory`)).json();
        return false;
    }

    public requestDnsChallenge(domainName: string): void {
        console.log(domainName);
    }

}