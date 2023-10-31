export class Client {
    _endpoint = 'https://acme-v02.api.letsencrypt.org';
    _directory;
    async init() {
        this._directory = await (await fetch(`${this._endpoint}/directory`)).json();
        return false;
    }
    requestDnsChallenge(domainName) {
        console.log(domainName);
    }
}
//# sourceMappingURL=Client.js.map