import {Element} from '../../Element';

export enum BlockButtonType {
    Block,
    BlockFlat,
    BlockSmall,
    BlockTool,
    BlockXS
}

type BlockButtonClickFn = () => void;

/**
 * BlockButton
 */
export class BlockButton extends Element {

    public constructor(element: any, blocktype: BlockButtonType = BlockButtonType.Block) {
        super();

        let bclass = 'btn-default btn-block';

        switch (blocktype) {
            case BlockButtonType.BlockFlat:
                bclass += ' .btn-flat';
                break;

            case BlockButtonType.BlockSmall:
                bclass += ' .btn-sm';
                break;

            case BlockButtonType.BlockTool:
                bclass = ' .btn-tool';
                break;

            case BlockButtonType.BlockXS:
                bclass = ' .btn-xs';
                break;
        }

        this._element = jQuery(`<button type="button" class="btn ${bclass}"></button>`).appendTo(element);
    }

    public setOnClickFn(onClick: BlockButtonClickFn): void {
        this._element.unbind().on('click', (): void => {
            onClick();
        });
    }

}