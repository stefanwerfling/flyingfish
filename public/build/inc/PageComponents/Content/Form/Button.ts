import {Element} from '../../Element';

type ButtonClickFn = () => void;

export class Button extends Element {

    public constructor(element: any) {
        super();

        this._element = jQuery(`<button type="button" class="btn btn-default"></button>`).appendTo(element);
    }

    public setOnClickFn(onClick: ButtonClickFn): void {
        this._element.unbind().on('click', (): void => {
            onClick();
        });
    }

}