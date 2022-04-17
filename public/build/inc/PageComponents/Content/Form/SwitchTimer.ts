import {Switch} from './Switch';

type SwitchTimeoutFn = () => void;

export class SwitchTimer extends Switch {

    protected _timeoutSec: number;
    protected _counter: number = 0;
    protected _intervalId: any;
    protected _labelValue: any;
    protected _timeoutFn: SwitchTimeoutFn|null = null;

    public constructor(element: any, id: string, timeoutSec: number, label: any = '') {
        super(element, id, label);

        this._timeoutSec = timeoutSec;
        this._labelValue = label;

        this.setChangeFn((value: boolean) => {
            if (value) {
                this._startInterval();
            } else {
                this._stopInterval();
            }
        });
    }

    protected _startInterval(): void {
        if (this._intervalId) {
            clearInterval(this._intervalId);
        }

        this._counter = this._timeoutSec;

        this._intervalId = setInterval(() => {
            if (this._counter <= 0) {
                this._counter = this._timeoutSec;

                if (this._timeoutFn !== null) {
                    this._timeoutFn();
                }
            } else {
                this._counter--;
            }

            this.setLabel(`${this._labelValue} ${this._counter}s`);
        }, 1000);
    }

    protected _stopInterval(): void {
        if (this._intervalId) {
            clearInterval(this._intervalId);
        }
    }

    public setTimeoutFn(onTimeoutFn: SwitchTimeoutFn): void {
        this._timeoutFn = onTimeoutFn;
    }

    public setEnable(enable: boolean): void {
        this._input.prop('checked', enable);

        if (enable) {
            this._startInterval();
        } else {
            this._stopInterval();
        }
    }

}