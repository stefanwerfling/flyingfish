class RequireJS {

    // @ts-ignore
    private _r: any = window.require;

    public config(config: any): void {
        this._r.config(config);
    }

    public require(reqs: string[], callback: any): void {
        this._r(reqs, callback);
    }

}

const rjs = new RequireJS();

rjs.config({
    paths: {
        moment: '../node_modules/public/node_modules/moment/min/moment.min'
    }
});